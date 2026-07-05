export type Role =
  | 'OWNER'
  | 'MANAGER'
  | 'ADMIN'
  | 'DOCTOR'
  | 'ASSISTANT'
  | 'RECEPTIONIST'
  | 'ACCOUNTANT'
  | 'NURSE'
  | 'STAFF';

export type Resource =
  | 'patients'
  | 'appointments'
  | 'billing'
  | 'clinical'
  | 'inventory'
  | 'lab_orders'
  | 'expenses'
  | 'staff'
  | 'reports'
  | 'settings';

export type Action = 'create' | 'read' | 'update' | 'delete';

type PermissionMatrix = Record<Role, Partial<Record<Resource, Action[]>>>;

export const PERMISSIONS: PermissionMatrix = {
  OWNER: {
    patients:     ['create', 'read', 'update', 'delete'],
    appointments: ['create', 'read', 'update', 'delete'],
    billing:      ['create', 'read', 'update', 'delete'],
    clinical:     ['create', 'read', 'update', 'delete'],
    inventory:    ['create', 'read', 'update', 'delete'],
    lab_orders:   ['create', 'read', 'update', 'delete'],
    expenses:     ['create', 'read', 'update', 'delete'],
    staff:        ['create', 'read', 'update', 'delete'],
    reports:      ['read'],
    settings:     ['create', 'read', 'update', 'delete'],
  },
  MANAGER: {
    patients:     ['create', 'read', 'update', 'delete'],
    appointments: ['create', 'read', 'update', 'delete'],
    billing:      ['create', 'read', 'update', 'delete'],
    clinical:     ['read'],
    inventory:    ['create', 'read', 'update', 'delete'],
    lab_orders:   ['create', 'read', 'update'],
    expenses:     ['create', 'read', 'update', 'delete'],
    staff:        ['create', 'read', 'update'],
    reports:      ['read'],
    settings:     ['create', 'read', 'update', 'delete'],
  },
  ADMIN: {
    patients:     ['create', 'read', 'update'],
    appointments: ['create', 'read', 'update', 'delete'],
    billing:      ['create', 'read', 'update'],
    clinical:     ['read'],
    inventory:    ['create', 'read', 'update'],
    lab_orders:   ['create', 'read', 'update'],
    expenses:     ['read'],
    staff:        ['create', 'read', 'update'],
    reports:      ['read'],
    settings:     ['read'],
  },
  DOCTOR: {
    patients:     ['create', 'read', 'update'],
    appointments: ['read', 'update'],
    billing:      ['read'],
    clinical:     ['create', 'read', 'update', 'delete'],
    inventory:    ['read'],
    lab_orders:   ['create', 'read', 'update'],
    expenses:     [],
    staff:        ['read'],
    reports:      ['read'],
    settings:     [],
  },

  ASSISTANT: {
    patients:     ['read', 'update'],
    appointments: ['create', 'read', 'update'],
    billing:      ['read'],
    clinical:     ['read', 'update'],
    inventory:    ['read'],
    lab_orders:   ['read'],
    expenses:     [],
    staff:        ['read'],
    reports:      ['read'],
    settings:     [],
  },
  RECEPTIONIST: {
    patients:     ['create', 'read', 'update'],
    appointments: ['create', 'read', 'update', 'delete'],
    billing:      ['create', 'read', 'update'],
    clinical:     [],
    inventory:    ['read'],
    lab_orders:   ['read'],
    expenses:     [],
    staff:        ['read'],
    reports:      [],
    settings:     [],
  },
  ACCOUNTANT: {
    patients:     ['read'],
    appointments: ['read'],
    billing:      ['create', 'read', 'update', 'delete'],
    clinical:     [],
    inventory:    ['read', 'update'],
    lab_orders:   ['read'],
    expenses:     ['create', 'read', 'update', 'delete'],
    staff:        ['read'],
    reports:      ['read'],
    settings:     [],
  },
  NURSE: {
    patients:     ['read', 'update'],
    appointments: ['read', 'update'],
    billing:      ['read'],
    clinical:     ['read', 'update'],
    inventory:    ['read'],
    lab_orders:   ['read'],
    expenses:     [],
    staff:        ['read'],
    reports:      [],
    settings:     [],
  },
  STAFF: {
    patients:     ['read'],
    appointments: ['read'],
    billing:      [],
    clinical:     [],
    inventory:    ['read'],
    lab_orders:   ['read'],
    expenses:     [],
    staff:        ['read'],
    reports:      [],
    settings:     [],
  },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  return PERMISSIONS[role]?.[resource]?.includes(action) ?? false;
}
