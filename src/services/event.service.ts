import { EventRepository } from '@/repositories/event.repository';
import { logger } from '@/lib/logger';
import { getTraceContextSync } from '@/lib/observability/context';
import { validateEvent } from '@/lib/events/validation';
import { DerivedEventsService } from './derived-events.service';

export type BusinessEntityType = 
  | 'PATIENT' 
  | 'APPOINTMENT' 
  | 'INVOICE' 
  | 'TREATMENT' 
  | 'STAFF' 
  | 'TENANT'
  | 'LAB_ORDER'
  | 'INVENTORY'
  | 'EXPENSE'
  | 'NOTIFICATION'
  | 'PRESCRIPTION'
  | 'ROOM'
  | 'SYSTEM'
  | 'SMS'
  | 'CAMPAIGN'
  | 'DOCTOR_COMMISSION';

export type BusinessEventType =
  | 'PATIENT_CREATED'
  | 'PATIENT_UPDATED'
  | 'PATIENT_DELETED'
  | 'PATIENT_NO_SHOW'
  | 'PATIENT_CHART_UPDATED'
  | 'CLINICAL_NOTE_ADDED'
  | 'DOCUMENT_UPLOADED'
  | 'PRESCRIPTION_CREATED'
  | 'APPOINTMENT_SCHEDULED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_COMPLETED'
  | 'APPOINTMENT_STATUS_CHANGED'
  | 'APPOINTMENT_RESCHEDULED'
  | 'INVOICE_CREATED'
  | 'INVOICE_UPDATED'
  | 'INVOICE_PAID'
  | 'INVOICE_OVERDUE'
  | 'INVOICE_CANCELLED'
  | 'INVOICE_DELETED'
  | 'TREATMENT_PLAN_CREATED'
  | 'TREATMENT_STARTED'
  | 'TREATMENT_COMPLETED'
  | 'TREATMENT_UPDATED'
  | 'STAFF_INVITED'
  | 'STAFF_ROLE_CHANGED'
  | 'STAFF_DELETED'
  | 'LAB_ORDER_CREATED'
  | 'LAB_ORDER_STATUS_CHANGED'
  | 'LAB_ORDER_DELETED'
  | 'INVENTORY_ITEM_CREATED'
  | 'INVENTORY_STOCK_ADDED'
  | 'INVENTORY_STOCK_DEDUCTED'
  | 'INVENTORY_ITEM_UPDATED'
  | 'INVENTORY_ITEM_DELETED'
  | 'EXPENSE_CREATED'
  | 'EXPENSE_UPDATED'
  | 'EXPENSE_DELETED'
  | 'NOTIFICATION_PREFERENCE_UPDATED'
  | 'NOTIFICATION_READ'
  | 'NOTIFICATIONS_ARCHIVED'
  | 'MEDICAL_CONDITION_ADDED'
  | 'ALLERGY_ADDED'
  | 'MEDICATION_ADDED'
  | 'SURGERY_ADDED'
  | 'FAMILY_HISTORY_ADDED'
  | 'TREATMENT_PLAN_DELETED'
  | 'TREATMENT_PLAN_STATUS_CHANGED'
  | 'TREATMENT_DELAYED'
  | 'ROOM_CREATED'
  | 'ROOM_UPDATED'
  | 'ROOM_ARCHIVED'
  | 'ROOM_STAFF_ASSIGNED'
  | 'ROOM_STAFF_REMOVED'
  | 'ROOM_STATUS_CHANGED'
  | 'ROOM_BECAME_BUSY'
  | 'ROOM_BECAME_AVAILABLE'
  | 'ROOM_BOOKING_CONFLICT'
  | 'ROOM_MAINTENANCE_STARTED'
  | 'ROOM_IDLE_TOO_LONG'
  | 'ROOM_OVERBOOKED'
  | 'DOCTOR_ROOM_CONFLICT'
  | 'SYSTEM_ALERT'
  | 'SECURITY_DENIED'
  | 'SMS_SENT'
  | 'SMS_FAILED'
  | 'CAMPAIGN_COMPLETED';

interface TrackEventOptions {
  tenantId: string;
  userId?: string;
  eventType: BusinessEventType;
  entityType: BusinessEntityType;
  entityId?: string;
  metadata?: Record<string, any>;
}

export class EventService {
  static instance?: EventService;

  constructor(
    private readonly eventRepository = new EventRepository(),
    private readonly derivedEventsService?: DerivedEventsService
  ) {}

  /**
   * Tracks a business event and persists it to the database.
   * Ensures data integrity via validation layer.
   */
  async trackEvent(options: TrackEventOptions) {
    const { tenantId, userId, eventType, entityType, entityId, metadata = {} } = options;
    const context = getTraceContextSync();

    try {
      // 1. Validation Layer
      const validation = validateEvent(eventType, metadata);
      if (!validation.success) {
        logger.error('Event rejected: Validation failed', validation.error, { eventType, entityId });
        return null;
      }

      // 2. Persist to DB
      const event = await this.eventRepository.create(tenantId, {
        userId: userId || context?.userId,
        eventType,
        entityType,
        entityId,
        metadata: metadata || {},
      });

      // 3. Structured Logging
      logger.info(`Business Event: ${eventType}`, {
        module: 'EVENT_SERVICE',
        action: eventType,
        tenantId,
        userId: userId || context?.userId,
        entityType,
        entityId,
        metadata: {
          ...metadata,
          eventId: event.id,
        },
      });

      // 4. Derived Intelligence Engine
      // Run asynchronously to prevent blocking the main flow
      if (this.derivedEventsService) {
        this.derivedEventsService.triggerDerivedEvents(event).catch(err => {
          logger.error('Derived events trigger failed', err, { eventId: event.id });
        });
      }

      return event;
    } catch (error) {
      // We don't want event tracking failure to crash the main operation
      logger.error('Failed to track business event', error, {
        module: 'EVENT_SERVICE',
        action: 'TRACK_EVENT_FAILURE',
        originalEvent: options,
      });
      return null;
    }
  }

  static async trackEvent(options: TrackEventOptions) {
    if (EventService.instance) {
      return EventService.instance.trackEvent(options);
    }
    const fallback = new EventService();
    return fallback.trackEvent(options);
  }
}

