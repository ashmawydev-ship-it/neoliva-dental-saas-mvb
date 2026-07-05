import { z } from "zod";

// Helper to format Zod errors into a user-friendly string
export function formatZodError(error: z.ZodError): string {
  return error.issues.map(err => {
    const path = err.path.join(".");
    return path ? `${path}: ${err.message}` : err.message;
  }).join("; ");
}

/**
 * 1. Patient Schema
 * Validates fields submitted from both the Add Patient Dialog and updates.
 */
export const PatientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must not exceed 100 characters"),
  phone1: z.string()
    .trim()
    .min(5, "Primary phone number must be at least 5 characters")
    .max(20, "Primary phone number must not exceed 20 characters")
    .regex(/^[+0-9\s-]+$/, "Primary phone number contains invalid characters"),
  phone2: z.string()
    .trim()
    .max(20, "Secondary phone number must not exceed 20 characters")
    .regex(/^[+0-9\s-]+$/, "Secondary phone number contains invalid characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z.string()
    .trim()
    .email("Invalid email format")
    .optional()
    .nullable()
    .or(z.literal("")),
  address: z.string().trim().max(200, "Address must not exceed 200 characters").optional().nullable().or(z.literal("")),
  postCode: z.string().trim().max(20, "Post code must not exceed 20 characters").optional().nullable().or(z.literal("")),
  city: z.string().trim().max(50, "City must not exceed 50 characters").optional().nullable().or(z.literal("")),
  dob: z.preprocess((val) => {
    if (!val) return null;
    const d = new Date(val as string);
    return isNaN(d.getTime()) ? null : d;
  }, z.date().max(new Date(), "Date of birth must be in the past").nullable().optional()),
  gender: z.string().trim().optional().nullable().or(z.literal("")),
  maritalStatus: z.string().trim().optional().nullable().or(z.literal("")),
  occupation: z.string().trim().max(100, "Occupation must not exceed 100 characters").optional().nullable().or(z.literal("")),
  insurance: z.string().trim().max(100, "Insurance name must not exceed 100 characters").optional().nullable().or(z.literal("")),
  ssn: z.string().trim().max(30, "SSN must not exceed 30 characters").optional().nullable().or(z.literal("")),
  idNumber: z.string().trim().max(50, "ID Number must not exceed 50 characters").optional().nullable().or(z.literal("")),
  medicalAlert: z.string().trim().max(200, "Medical alert must not exceed 200 characters").optional().nullable().or(z.literal("")),
  referredBy: z.string().trim().max(100, "Referred by must not exceed 100 characters").optional().nullable().or(z.literal("")),
  notes: z.string().trim().optional().nullable().or(z.literal("")),
  bloodGroup: z.string().trim().max(10, "Blood group must not exceed 10 characters").optional().nullable().or(z.literal("")),
  medicalNotes: z.string().trim().optional().nullable().or(z.literal("")),
  isDeceased: z.preprocess((val) => val === 'true' || val === true, z.boolean()),
  isSigned: z.preprocess((val) => val === 'true' || val === true, z.boolean()),
});

/**
 * 2. Appointment Schema
 * Validates fields submitted when scheduling or rescheduling an appointment.
 */
export const AppointmentSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID format"),
  doctorId: z.string().uuid("Invalid doctor ID format"),
  serviceId: z.string().uuid("Invalid service ID format").optional().nullable().or(z.literal("")).transform(v => v === "" ? undefined : v),
  date: z.preprocess((val) => {
    if (!val) return null;
    const d = new Date(val as string);
    return isNaN(d.getTime()) ? null : d;
  }, z.date({ message: "Appointment date is required" }).refine((val) => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    return val >= todayMidnight;
  }, "Appointment date cannot be in the past")),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"),
  duration: z.number().int("Duration must be an integer").positive("Duration must be strictly greater than 0"),
  treatment: z.string().trim().min(1, "Treatment name is required").max(200, "Treatment name must not exceed 200 characters"),
  notes: z.string().trim().optional().nullable().or(z.literal("")),
  color: z.string().trim().optional().nullable().or(z.literal("")),
  roomId: z.string().uuid("Invalid room ID format").optional().nullable().or(z.literal("")).transform(v => v === "" ? undefined : v),
  chairId: z.string().uuid("Invalid chair ID format").optional().nullable().or(z.literal("")).transform(v => v === "" ? undefined : v),
});

/**
 * 3. Invoice & Invoice Item Schemas
 * Validates creation of invoices and recording of payments.
 */
export const InvoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Item description is required").max(200, "Item description must not exceed 200 characters"),
  quantity: z.number().int("Quantity must be an integer").min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Item price must be non-negative (>= 0)"),
  serviceId: z.string().uuid("Invalid service ID format").optional().nullable().or(z.literal("")),
});

export const InvoiceSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID format"),
  appointmentId: z.string().uuid("Invalid appointment ID format").optional().nullable().or(z.literal("")),
  dueDate: z.preprocess((val) => {
    if (!val) return null;
    const d = new Date(val as string);
    return isNaN(d.getTime()) ? null : d;
  }, z.date().optional().nullable()),
  items: z.array(InvoiceItemSchema).nonempty("At least one invoice item is required"),
});

export const PaymentSchema = z.object({
  amount: z.number().positive("Payment amount must be strictly greater than 0"),
  method: z.enum(["CASH", "CARD", "TRANSFER"], { message: "Invalid payment method (CASH, CARD, or TRANSFER)" }),
  notes: z.string().trim().optional().nullable().or(z.literal("")),
  paidAt: z.preprocess((val) => {
    if (!val) return null;
    const d = new Date(val as string);
    return isNaN(d.getTime()) ? null : d;
  }, z.date().optional().nullable()),
});

export const InvoiceFormSchema = z.object({
  patientId: z.string().uuid("Please select a patient"),
  serviceId: z.string().uuid("Invalid service ID format").optional().nullable().or(z.literal("")),
  amount: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number().min(0, "Amount must be non-negative (>= 0)")),
  dueDate: z.string().optional().nullable().or(z.literal("")),
  treatment: z.string().trim().min(1, "Treatment/Description is required").max(200, "Treatment/Description must not exceed 200 characters"),
});
