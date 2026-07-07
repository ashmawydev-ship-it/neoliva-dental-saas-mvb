const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
import { prisma } from '@/lib/prisma';
import { smsService } from './smsService';
import { EventService } from './event.service';

export interface CampaignFilters {
  lastVisitMonths?: number;
  procedures?: string[];
  minAge?: number;
  maxAge?: number;
  gender?: string;
  hasBalance?: boolean;
  upcomingAppointmentsDays?: number;
}

export class SmsCampaignService {
  static instance?: SmsCampaignService;

  constructor(
    private readonly prismaClient = prisma,
    private readonly smsServiceInstance = smsService,
    private readonly eventService = EventService.instance || new EventService()
  ) {}
  /**
   * Translates filter criteria into Prisma "where" clause for Patient.
   */
  private buildAudienceQuery(tenantId: string, filters: CampaignFilters) {
    const whereClause: any = {
      tenantId,
      phone: { not: null }, // Must have a phone number
      AND: []
    };

    // Age filter
    if (filters.minAge || filters.maxAge) {
      const now = new Date();
      whereClause.dob = {};
      if (filters.minAge) {
        const maxDob = new Date();
        maxDob.setFullYear(now.getFullYear() - filters.minAge);
        whereClause.dob.lte = maxDob;
      }
      if (filters.maxAge) {
        const minDob = new Date();
        minDob.setFullYear(now.getFullYear() - filters.maxAge - 1);
        whereClause.dob.gt = minDob;
      }
    }

    // Gender filter
    if (filters.gender) {
      whereClause.gender = { equals: filters.gender, mode: 'insensitive' };
    }

    // Outstanding balance filter
    if (filters.hasBalance) {
      whereClause.invoices = {
        some: {
          status: { not: 'PAID' }
        }
      };
    }

    // Procedure type filter
    if (filters.procedures && filters.procedures.length > 0) {
      whereClause.AND.push({
        appointments: {
          some: {
            service: {
              name: { in: filters.procedures }
            }
          }
        }
      });
    }

    // Last visit > N months ago
    if (filters.lastVisitMonths) {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - filters.lastVisitMonths);
      
      whereClause.AND.push({
        appointments: {
          none: {
            date: { gte: cutoffDate }
          },
          some: {
            date: { lt: cutoffDate }
          }
        }
      });
    }

    // Upcoming appointments within N days
    if (filters.upcomingAppointmentsDays) {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + filters.upcomingAppointmentsDays);
      
      whereClause.AND.push({
        appointments: {
          some: {
            date: { gte: now, lte: futureDate },
            status: 'SCHEDULED'
          }
        }
      });
    }

    if (whereClause.AND.length === 0) {
      delete whereClause.AND;
    }

    return whereClause;
  }

  /**
   * Return the count of matching patients.
   */
  async previewAudience(tenantId: string, filters: CampaignFilters): Promise<number> {
    const where = this.buildAudienceQuery(tenantId, filters);
    const count = await this.prismaClient.patient.count({ where });
    return count;
  }

  /**
   * Check daily rate limits: max 1000 SMS per tenant per day.
   */
  async checkDailyLimit(tenantId: string, needed: number): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const campaignsToday = await this.prismaClient.smsCampaign.findMany({
      where: {
        tenantId,
        createdAt: { gte: today },
        status: { in: ['COMPLETED', 'PROCESSING'] }
      },
        take: DEFAULT_PAGE_SIZE
    });

    const sentToday = campaignsToday.reduce((acc, c) => acc + c.sentCount, 0);
    return (sentToday + needed) <= 1000;
  }

  /**
   * Create a DRAFT campaign.
   */
  async createCampaign(tenantId: string, data: { name: string; message: string; filters: CampaignFilters }) {
    return this.prismaClient.smsCampaign.create({
      data: {
        tenantId,
        name: data.name,
        message: data.message,
        filters: data.filters as any,
        status: 'DRAFT'
      }
    });
  }

  /**
   * Process a campaign: fetches patients, replaces variables, sends batches.
   */
  async processCampaign(tenantId: string, campaignId: string) {
    const campaign = await this.prismaClient.smsCampaign.findUnique({
      where: { id: campaignId, tenantId }
    });

    if (!campaign || campaign.status !== 'DRAFT') {
      throw new Error("Invalid campaign or not in DRAFT status");
    }

    // Mark as processing
    await this.prismaClient.smsCampaign.update({
      where: { id: campaignId },
      data: { status: 'PROCESSING' }
    });

    try {
      const filters = campaign.filters as CampaignFilters;
      const where = this.buildAudienceQuery(tenantId, filters);
      
      const patients = await this.prismaClient.patient.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          appointments: {
            orderBy: { date: 'desc' },
            take: 1,
            select: { date: true }
          }
        },
          take: DEFAULT_PAGE_SIZE
    });

      // Enforce rate limit per campaign explicitly as safety catch
      if (patients.length > 1000) {
        throw new Error("Campaign audience exceeds 1000 patients limit.");
      }

      const canSend = await this.checkDailyLimit(tenantId, patients.length);
      if (!canSend) {
        throw new Error("Daily SMS limit (1000) exceeded.");
      }

      let sentCount = 0;
      let failedCount = 0;
      const clinicName = "Neoliva Dental"; // In a real app, fetch from Tenant or ClinicSettings

      // Process in batches of 50
      const batchSize = 50;
      for (let i = 0; i < patients.length; i += batchSize) {
        const batch = patients.slice(i, i + batchSize);
        
        const payloads = batch.map(p => {
          let body = campaign.message.replace(/{{patient_name}}/g, p.name);
          body = body.replace(/{{clinic_name}}/g, clinicName);
          
          const lastAppt = p.appointments[0]?.date;
          body = body.replace(/{{appointment_date}}/g, lastAppt ? lastAppt.toLocaleDateString() : 'recent visit');

          return { to: p.phone as string, body };
        });

        // Use the abstract smsService
        const result = await this.smsServiceInstance.sendBulkSms(tenantId, payloads);
        sentCount += result.sent;
        failedCount += result.failed;
      }

      await this.prismaClient.smsCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'COMPLETED',
          sentCount,
          failedCount
        }
      });

      await this.eventService.trackEvent({
        tenantId,
        eventType: 'CAMPAIGN_COMPLETED',
        entityId: campaignId,
        entityType: 'CAMPAIGN',
        metadata: { sentCount, failedCount }
      });

    } catch (error: any) {
      await this.prismaClient.smsCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'DRAFT', // Revert to DRAFT so it can be fixed/retried
          failedCount: 0
        }
      });
      throw error;
    }
  }

  async getCampaigns(tenantId: string) {
    return this.prismaClient.smsCampaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
        take: DEFAULT_PAGE_SIZE
    });
  }
}

export const smsCampaignService = new SmsCampaignService();
