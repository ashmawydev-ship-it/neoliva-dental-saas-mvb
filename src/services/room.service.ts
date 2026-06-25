import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { AuditService } from './audit.service';
import { EventService } from './event.service';
import { RoomType, RoomStatus, Prisma } from '@/generated/client';
import { PermissionCode } from '@/types/permissions';
import { requirePermission } from '@/lib/rbac';
import { z } from 'zod';

// --- Validation Schemas ---

export const RoomSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  slug: z.string().optional(), // Make slug optional for auto-generation
  type: z.nativeEnum(RoomType),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const RoomAssignmentSchema = z.object({
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string().optional(),
});

export const RoomBookingValidationSchema = z.object({
  roomId: z.string().uuid(),
  chairId: z.string().uuid().optional(),
  doctorId: z.string().uuid(),
  date: z.date(),
  time: z.date(), // We expect a Date object where time part is relevant
  duration: z.number().min(5, "Duration must be at least 5 minutes"),
  excludeAppointmentId: z.string().uuid().optional(), // For updates
});

export type RoomBookingValidation = z.infer<typeof RoomBookingValidationSchema>;

export class RoomService {
  static instance?: RoomService;

  constructor(
    private readonly prismaClient = prisma
  ) {}

  static async createRoom(tenantId: string, data: z.infer<typeof RoomSchema>) {
    return (RoomService.instance || new RoomService()).createRoom(tenantId, data);
  }
  static async updateRoom(tenantId: string, roomId: string, data: Partial<z.infer<typeof RoomSchema>>) {
    return (RoomService.instance || new RoomService()).updateRoom(tenantId, roomId, data);
  }
  static async changeRoomStatus(tenantId: string, roomId: string, status: RoomStatus) {
    return (RoomService.instance || new RoomService()).changeRoomStatus(tenantId, roomId, status);
  }
  static async assignStaffToRoom(tenantId: string, assignment: z.infer<typeof RoomAssignmentSchema>) {
    return (RoomService.instance || new RoomService()).assignStaffToRoom(tenantId, assignment);
  }
  static async removeStaffFromRoom(tenantId: string, roomId: string, userId: string) {
    return (RoomService.instance || new RoomService()).removeStaffFromRoom(tenantId, roomId, userId);
  }
  static async getRoomSchedule(tenantId: string, roomId: string, date: Date) {
    return (RoomService.instance || new RoomService()).getRoomSchedule(tenantId, roomId, date);
  }
  static async validateRoomBooking(tenantId: string, options: RoomBookingValidation) {
    return (RoomService.instance || new RoomService()).validateRoomBooking(tenantId, options);
  }
  static async addChairToRoom(tenantId: string, roomId: string, name: string, code?: string) {
    return (RoomService.instance || new RoomService()).addChairToRoom(tenantId, roomId, name, code);
  }
  static async getRoomsLiveStatus(tenantId: string) {
    return (RoomService.instance || new RoomService()).getRoomsLiveStatus(tenantId);
  }
  /**
   * CREATE ROOM
   */
  async createRoom(tenantId: string, data: z.infer<typeof RoomSchema>) {
    await requirePermission(PermissionCode.ROOM_MANAGE);

    // Auto-generate slug if not provided
    const slug = data.slug || await this.generateUniqueRoomSlug(tenantId, data.name);

    const room = await this.prismaClient.room.create({
      data: {
        ...data,
        slug,
        tenantId,
      },
    });

    await AuditService.logAudit({
      action: 'ROOM_CREATED',
      entityType: 'ROOM',
      entityId: room.id,
      tenantId,
      metadata: { name: room.name, type: room.type }
    });

    await EventService.trackEvent({
      tenantId,
      eventType: 'ROOM_CREATED',
      entityType: 'ROOM',
      entityId: room.id,
      metadata: { name: room.name }
    });

    return room;
  }

  /**
   * UPDATE ROOM
   */
  async updateRoom(tenantId: string, roomId: string, data: Partial<z.infer<typeof RoomSchema>>) {
    await requirePermission(PermissionCode.ROOM_MANAGE);

    const room = await this.prismaClient.room.update({
      where: { id: roomId, tenantId },
      data,
    });

    await AuditService.logAudit({
      action: 'ROOM_UPDATED',
      entityType: 'ROOM',
      entityId: room.id,
      tenantId,
      metadata: data
    });

    return room;
  }

  /**
   * CHANGE ROOM STATUS
   */
  async changeRoomStatus(tenantId: string, roomId: string, status: RoomStatus) {
    await requirePermission(PermissionCode.ROOM_MANAGE);

    const room = await this.prismaClient.room.update({
      where: { id: roomId, tenantId },
      data: { status },
    });

    const eventType = status === RoomStatus.BUSY ? 'ROOM_BECAME_BUSY' : 
                      status === RoomStatus.AVAILABLE ? 'ROOM_BECAME_AVAILABLE' : 
                      status === RoomStatus.MAINTENANCE ? 'ROOM_MAINTENANCE_STARTED' : 
                      'ROOM_STATUS_CHANGED';

    await EventService.trackEvent({
      tenantId,
      eventType: eventType as any,
      entityType: 'ROOM',
      entityId: room.id,
      metadata: { oldStatus: room.status, newStatus: status }
    });

    return room;
  }

  /**
   * ASSIGN STAFF TO ROOM
   */
  async assignStaffToRoom(tenantId: string, assignment: z.infer<typeof RoomAssignmentSchema>) {
    await requirePermission(PermissionCode.ROOM_STAFF_ASSIGN);

    const roomStaff = await this.prismaClient.roomStaff.upsert({
      where: {
        roomId_userId: {
          roomId: assignment.roomId,
          userId: assignment.userId
        }
      },
      update: { role: assignment.role },
      create: assignment,
    });

    await AuditService.logAudit({
      action: 'ROOM_STAFF_ASSIGNED',
      entityType: 'ROOM',
      entityId: assignment.roomId,
      tenantId,
      metadata: { userId: assignment.userId, role: assignment.role }
    });

    return roomStaff;
  }

  /**
   * REMOVE STAFF FROM ROOM
   */
  async removeStaffFromRoom(tenantId: string, roomId: string, userId: string) {
    await requirePermission(PermissionCode.ROOM_STAFF_ASSIGN);

    await this.prismaClient.roomStaff.delete({
      where: {
        roomId_userId: { roomId, userId }
      }
    });

    await AuditService.logAudit({
      action: 'ROOM_STAFF_REMOVED',
      entityType: 'ROOM',
      entityId: roomId,
      tenantId,
      metadata: { userId }
    });
  }

  /**
   * GET ROOM SCHEDULE
   */
  async getRoomSchedule(tenantId: string, roomId: string, date: Date) {
    await requirePermission(PermissionCode.ROOM_VIEW);

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prismaClient.appointment.findMany({
      where: {
        tenantId,
        roomId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { not: 'CANCELLED' }
      },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
        chair: true,
      },
      orderBy: { time: 'asc' }
    });
  }

  /**
   * VALIDATE ROOM BOOKING (The Core Engine)
   */
  async validateRoomBooking(tenantId: string, options: RoomBookingValidation) {
    const { roomId, chairId, doctorId, date, time, duration, excludeAppointmentId } = options;

    const startTime = new Date(time);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // 1. Check Room Availability (overlapping appointments in same room)
    const roomOverlap = await this.prismaClient.appointment.findFirst({
      where: {
        tenantId,
        roomId,
        date,
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        status: { not: 'CANCELLED' },
        OR: [
          {
            // New appointment starts during an existing one
            time: { lte: startTime },
            // duration: need to calculate end time. In Prisma we might need raw or just check overlaps
            // Since we don't have 'endTime' stored, we'll check:
            // (existing.time < new.endTime) AND (existing.endTime > new.startTime)
            // But we don't have existing.endTime. We have duration.
          }
        ]
      }
    });

    // Strategy for overlap: 
    // An appointment overlaps if:
    // ExistingStart < NewEnd AND NewStart < ExistingEnd
    // ExistingEnd = ExistingStart + ExistingDuration
    
    // Using raw query for precise overlap check across duration
    const conflicts = await this.prismaClient.$queryRaw<any[]>`
      SELECT id, type FROM (
        -- Room Overlap
        SELECT id, 'ROOM' as type FROM appointments
        WHERE tenant_id = ${tenantId}::uuid
          AND room_id = ${roomId}::uuid
          AND date = ${date}::date
          AND status != 'CANCELLED'
          AND (${excludeAppointmentId}::uuid IS NULL OR id != ${excludeAppointmentId}::uuid)
          AND time < (${startTime}::time + (${duration} || ' minutes')::interval)
          AND (time + (duration || ' minutes')::interval) > ${startTime}::time

        UNION ALL

        -- Doctor Overlap
        SELECT id, 'DOCTOR' as type FROM appointments
        WHERE tenant_id = ${tenantId}::uuid
          AND doctor_id = ${doctorId}::uuid
          AND date = ${date}::date
          AND status != 'CANCELLED'
          AND (${excludeAppointmentId}::uuid IS NULL OR id != ${excludeAppointmentId}::uuid)
          AND time < (${startTime}::time + (${duration} || ' minutes')::interval)
          AND (time + (duration || ' minutes')::interval) > ${startTime}::time

        UNION ALL

        -- Chair Overlap (if chair provided)
        SELECT id, 'CHAIR' as type FROM appointments
        WHERE ${chairId}::uuid IS NOT NULL
          AND tenant_id = ${tenantId}::uuid
          AND chair_id = ${chairId}::uuid
          AND date = ${date}::date
          AND status != 'CANCELLED'
          AND (${excludeAppointmentId}::uuid IS NULL OR id != ${excludeAppointmentId}::uuid)
          AND time < (${startTime}::time + (${duration} || ' minutes')::interval)
          AND (time + (duration || ' minutes')::interval) > ${startTime}::time
      ) as conflict_check
    `;

    if (conflicts.length > 0) {
      const types = Array.from(new Set(conflicts.map(c => c.type)));
      
      await EventService.trackEvent({
        tenantId,
        eventType: 'ROOM_BOOKING_CONFLICT',
        entityType: 'ROOM',
        entityId: roomId,
        metadata: { types, requestedStartTime: startTime, doctorId }
      });

      throw new Error(`Booking Conflict: The following resources are unavailable: ${types.join(', ')}`);
    }

    return true;
  }

  /**
   * ADD CHAIR TO ROOM
   */
  async addChairToRoom(tenantId: string, roomId: string, name: string, code?: string) {
    await requirePermission(PermissionCode.ROOM_MANAGE);

    return this.prismaClient.roomChair.create({
      data: {
        roomId,
        name,
        code,
      }
    });
  }

  /**
   * GET ROOMS LIVE STATUS (Queue Infrastructure)
   */
  async getRoomsLiveStatus(tenantId: string) {
    await requirePermission(PermissionCode.ROOM_VIEW);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prismaClient.room.findMany({
      where: { tenantId, isActive: true },
      include: {
        roomStaff: { 
          include: { 
            user: { 
              select: { 
                id: true, 
                email: true,
                memberships: {
                  where: { tenantId },
                  select: {
                    role: true,
                    staffProfile: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              } 
            } 
          } 
        },
        roomChairs: {
          include: {
            appointments: {
              where: {
                date: today,
                status: { in: ['IN_PROGRESS', 'WAITING'] }
              },
              include: { patient: { select: { name: true } } }
            }
          }
        }
      }
    });
  }

  /**
   * HELPERS: Slug generation
   */
  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')     // Replace spaces with -
      .replace(/[^\w\u0621-\u064A-]+/g, '') // Remove all non-word chars (except Arabic and hyphens)
      .replace(/--+/g, '-')     // Replace multiple - with single -
      .replace(/^-+/, '')       // Trim - from start of text
      .replace(/-+$/, '');      // Trim - from end of text
  }

  private async generateUniqueRoomSlug(tenantId: string, name: string): Promise<string> {
    const baseSlug = this.slugify(name) || 'room';
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prismaClient.room.findFirst({
        where: { tenantId, slug },
        select: { id: true }
      });

      if (!existing) return slug;

      counter++;
      slug = `${baseSlug}-${counter}`;
    }
  }
}
