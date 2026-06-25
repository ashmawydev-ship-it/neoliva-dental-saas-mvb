import { EventService } from './event.service';

interface SmsPayload {
  to: string;
  body: string;
}

export class SmsService {
  static instance?: SmsService;

  constructor(
    private readonly eventService = EventService.instance || new EventService()
  ) {}
  /**
   * Send a single SMS message.
   * This is an abstraction. Currently, it logs the intent and simulates a successful send.
   * In the future, this can be swapped with Twilio, AWS SNS, etc.
   */
  async sendSms(tenantId: string, payload: SmsPayload): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 50));

      // In a real implementation, you would call your SMS provider here.
      // Example:
      // const response = await twilioClient.messages.create({
      //   body: payload.body,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: payload.to
      // });

      const simulatedId = `sms_${Math.random().toString(36).substring(2, 9)}`;

      // Log success using eventService
      await this.eventService.trackEvent({
        tenantId,
        eventType: 'SMS_SENT',
        entityId: simulatedId,
        entityType: 'SMS',
        metadata: {
          to: payload.to,
          bodyLength: payload.body.length,
        },
      });

      return { success: true, id: simulatedId };
    } catch (error: any) {
      // Log failure
      await this.eventService.trackEvent({
        tenantId,
        eventType: 'SMS_FAILED',
        entityId: payload.to,
        entityType: 'SMS',
        metadata: {
          error: error.message,
        },
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS in bulk. Useful for reducing provider API calls if supported.
   * Otherwise falls back to concurrent single sends.
   */
  async sendBulkSms(tenantId: string, payloads: SmsPayload[]): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    // Concurrently send in chunks to respect rate limits
    const chunkSize = 10;
    for (let i = 0; i < payloads.length; i += chunkSize) {
      const chunk = payloads.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map(p => this.sendSms(tenantId, p)));
      
      results.forEach(r => {
        if (r.success) sent++;
        else failed++;
      });
    }

    return { sent, failed };
  }
}

export const smsService = new SmsService();
