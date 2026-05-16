
import { prisma } from '@/lib/prisma';
import { createHash, createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'crypto';

export interface SessionData {
  userId: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

export class SessionService {
  private static HASH_ALGO = 'sha256';
  private static ENCRYPTION_ALGO = 'aes-256-gcm';
  // Fallback for development, should be in env in production
  private static ENCRYPTION_KEY = Buffer.from(process.env.SESSION_ENCRYPTION_SECRET || 'a'.repeat(64), 'hex');

  /**
   * Creates a new persistent session in the database
   */
  static async createSession(data: SessionData, supabaseRefreshToken: string, tx?: any) {
    const appRefreshToken = randomUUID();
    const refreshTokenHash = this.hashToken(appRefreshToken);
    const encryptedSupabaseToken = this.encrypt(supabaseRefreshToken);
    
    // Set expiry to 90 days as requested
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const client = tx || prisma;

    const session = await client.session.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        refreshTokenHash,
        supabaseRefreshToken: encryptedSupabaseToken,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        deviceFingerprint: data.deviceFingerprint,
        expiresAt,
      }
    });

    return {
      session,
      appRefreshToken
    };
  }

  /**
   * Validates a session without rotating it
   */
  static async validateSession(appRefreshToken: string) {
    const hash = this.hashToken(appRefreshToken);
    
    const session = await prisma.session.findFirst({
      where: {
        refreshTokenHash: hash,
        isRevoked: false,
        expiresAt: { gt: new Date() }
      },
      include: {
        tenant: true
      }
    });

    if (!session) return null;

    // Tenant-level block check
    if (session.tenant && ['SUSPENDED', 'DISABLED', 'BLOCKED', 'CANCELLED'].includes(session.tenant.status)) {
      console.warn(`[AUTH_TRACE][SESSION_VALIDATION_FAILED] SessionId: ${session.id}, TenantId: ${session.tenantId}, Reason: TENANT_${session.tenant.status}`);
      await this.revokeSession(session.id);
      return null;
    }

    console.log(`[AUTH_TRACE][SESSION_VALIDATION_SUCCESS] SessionId: ${session.id}, UserId: ${session.userId}, TenantId: ${session.tenantId}`);

    return session;
  }

  /**
   * Validates and rotates a session
   */
  static async refreshSession(appRefreshToken: string, ip?: string, userAgent?: string) {
    const hash = this.hashToken(appRefreshToken);
    
    const session = await prisma.session.findFirst({
      where: {
        refreshTokenHash: hash,
        isRevoked: false,
        expiresAt: { gt: new Date() }
      },
      include: {
        tenant: true
      }
    });

    if (!session) {
      throw new Error('SESSION_EXPIRED');
    }

    // Phase 5: Tenant-Aware Security
    if (session.tenant && ['SUSPENDED', 'DISABLED', 'BLOCKED', 'CANCELLED'].includes(session.tenant.status)) {
      console.warn(`[AUTH_TRACE][SESSION_REFRESH_FAILED] SessionId: ${session.id}, TenantId: ${session.tenantId}, Reason: TENANT_${session.tenant.status}`);
      await this.revokeSession(session.id);
      throw new Error('TENANT_BLOCKED');
    }

    const decryptedSupabaseToken = session.supabaseRefreshToken ? this.decrypt(session.supabaseRefreshToken) : null;

    // Rotate: Create new token
    const newAppRefreshToken = randomUUID();
    const newHash = this.hashToken(newAppRefreshToken);

    const updatedSession = await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newHash,
        lastUsedAt: new Date(),
        ipAddress: ip ?? session.ipAddress,
        userAgent: userAgent ?? session.userAgent
      }
    });

    return {
      session: updatedSession,
      newAppRefreshToken,
      supabaseRefreshToken: decryptedSupabaseToken
    };
  }

  /**
   * Updates the supabase refresh token for an existing session
   */
  static async updateSupabaseToken(sessionId: string, newSupabaseRefreshToken: string) {
    const encrypted = this.encrypt(newSupabaseRefreshToken);
    return prisma.session.update({
      where: { id: sessionId },
      data: { supabaseRefreshToken: encrypted }
    });
  }

  static async revokeSession(sessionId: string) {
    return prisma.session.update({
      where: { id: sessionId },
      data: { isRevoked: true }
    });
  }

  static async revokeAllSessionsForTenant(tenantId: string) {
    console.log(`[AUTH_TRACE][REVOKE_ALL_TENANT_SESSIONS] TenantId: ${tenantId}`);
    return prisma.session.updateMany({
      where: { tenantId },
      data: { isRevoked: true }
    });
  }

  static async getActiveSessions(tenantId: string) {
    return prisma.session.findMany({
      where: { 
        tenantId,
        isRevoked: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
        userId: true
      }
    });
  }

  private static hashToken(token: string): string {
    return createHash(this.HASH_ALGO).update(token).digest('hex');
  }

  private static encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.ENCRYPTION_ALGO, this.ENCRYPTION_KEY, iv) as any;
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  private static decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv(this.ENCRYPTION_ALGO, this.ENCRYPTION_KEY, iv) as any;
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
