import { EventRepository } from '@/repositories/event.repository';

export type AlertType = 'NO_SHOW' | 'OVERDUE' | 'TREATMENT_DELAY';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface OperationalAlert {
  type: AlertType;
  severity: AlertSeverity;
  count: number;
  message: string;
  actionUrl: string;
}

const SEVERITY_THRESHOLDS: Record<AlertType, { high: number; medium: number }> = {
  NO_SHOW:         { high: 10, medium: 5 },
  OVERDUE:         { high: 15, medium: 7 },
  TREATMENT_DELAY: { high: 8,  medium: 3 },
};

const DERIVED_EVENT_MAP: Record<string, AlertType> = {
  PATIENT_NO_SHOW:    'NO_SHOW',
  INVOICE_OVERDUE:    'OVERDUE',
  TREATMENT_DELAYED:  'TREATMENT_DELAY',
};

export class AlertsService {
  static instance?: AlertsService;

  constructor(
    private readonly eventRepository = new EventRepository()
  ) {}

  async getOperationalAlerts(tenantId: string): Promise<OperationalAlert[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Single aggregation query — pull counts for all derived event types at once
    const rawCounts = await this.eventRepository.getOperationalAlertsCount(
      tenantId,
      since,
      ['PATIENT_NO_SHOW', 'INVOICE_OVERDUE', 'TREATMENT_DELAYED']
    );

    const alerts: OperationalAlert[] = rawCounts.map(({ eventType, _count }) => {
      const type = DERIVED_EVENT_MAP[eventType];
      const count = _count.id;
      const severity = getSeverity(type, count);

      return {
        type,
        severity,
        count,
        message: buildMessage(type, count),
        actionUrl: `/dashboard/events-debug?filter=${eventType}`,
      };
    });

    // Sort HIGH → MEDIUM → LOW, then by count desc within same severity
    return alerts.sort((a, b) => {
      const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      return severityDiff !== 0 ? severityDiff : b.count - a.count;
    });
  }
}

function getSeverity(type: AlertType, count: number): AlertSeverity {
  const { high, medium } = SEVERITY_THRESHOLDS[type];
  if (count > high)   return 'HIGH';
  if (count > medium) return 'MEDIUM';
  return 'LOW';
}

function buildMessage(type: AlertType, count: number): string {
  switch (type) {
    case 'NO_SHOW':
      return count > 10
        ? `No-show rate is high today (${count} patients missed appointments)`
        : `${count} patient${count !== 1 ? 's' : ''} missed their appointment today`;
    case 'OVERDUE':
      return `${count} invoice${count !== 1 ? 's are' : ' is'} overdue`;
    case 'TREATMENT_DELAY':
      return `${count} treatment${count !== 1 ? 's are' : ' is'} delayed`;
  }
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/**
 * Aggregates derived business events from the last 24 hours into
 * actionable operational alerts, scoped strictly to the given tenant.
 */
export async function getOperationalAlerts(tenantId: string): Promise<OperationalAlert[]> {
  return (AlertsService.instance || new AlertsService()).getOperationalAlerts(tenantId);
}
