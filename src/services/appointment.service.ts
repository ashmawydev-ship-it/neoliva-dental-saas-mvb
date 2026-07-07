import "server-only";
import { AppointmentRepository } from "@/repositories/appointment.repository";
import { InventoryService } from "./inventory.service";
import { AppointmentStatus } from "@/generated/client";
import { PatientRepository } from "@/repositories/patient.repository";
import { StaffRepository } from "@/repositories/staff.repository";
import { ServiceRepository } from "@/repositories/service.repository";

import { NotificationService } from "./notification.service";
import { RoomService } from "./room.service";
import { prisma } from "@/lib/prisma";

export class AppointmentService {
  constructor(
    private readonly appointmentRepository = new AppointmentRepository(),
    private readonly inventoryService = new InventoryService(),
    private readonly notificationService = new NotificationService(),
    private readonly patientRepository = new PatientRepository(),
    private readonly staffRepository = new StaffRepository(),
    private readonly serviceRepository = new ServiceRepository()
  ) {}

  private normalizeString(val: string | null | undefined, fallback: string = "-"): string {
    if (!val || typeof val !== 'string') return fallback;
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  private getSafeFallback(id?: string): any {
    return {
      id: id || "unknown",
      patient: "Unknown Patient",
      patientId: "unknown",
      doctor: "No Doctor",
      doctorId: "unknown",
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-US'),
      time: new Date().toLocaleTimeString('en-US'),
      status: 'SCHEDULED',
      treatment: "No treatment",
      notes: "",
      hasInvoice: false,
      invoiceStatus: "DRAFT",
      invoiceAmount: 0,
      avatar: "??",
      color: 'from-blue-500 to-indigo-600'
    };
  }

  private validateTenant(tenantId: string) {
    if (!tenantId) {
      throw new Error("[AppointmentService] Missing tenantId");
    }
  }

  /**
   * Helper for initials
   */
  private getInitials(name: string) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '??';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  /**
   * Get formatted list of appointments for the main table/list view
   */
  async getAppointmentsList(tenantId: string) {
    try {
      this.validateTenant(tenantId);
      console.log(`[AppointmentService] Fetching appointments for tenant: ${tenantId}`);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const ninetyDaysFuture = new Date();
      ninetyDaysFuture.setDate(ninetyDaysFuture.getDate() + 90);

      const appointments = await this.appointmentRepository.findMany(tenantId, {
        where: {
          date: {
            gte: thirtyDaysAgo,
            lte: ninetyDaysFuture
          }
        }
      });

      return (appointments || []).map(apt => {
        try {
          const start = apt.date ? new Date(apt.date) : new Date();
          const time = apt.time ? new Date(apt.time) : new Date();
          start.setHours(time.getHours(), time.getMinutes());
          
          const end = new Date(start);
          end.setMinutes(end.getMinutes() + (apt.duration || 30));

          const patientName = this.normalizeString(apt.patient?.name, "Unknown Patient");

          return {
            id: apt.id,
            patient: patientName,
            patientId: apt.patientId,
            doctor: apt.doctor?.name ? `Dr. ${apt.doctor.name}` : "No Doctor",
            doctorId: apt.doctorId,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            date: apt.date ? new Date(apt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-',
            time: apt.time ? new Date(apt.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '-',
            status: apt.status || 'SCHEDULED',
            treatment: apt.service?.name || apt.treatment || 'No treatment',
            notes: apt.notes || "",
            hasInvoice: !!apt.invoice,
            invoiceStatus: apt.invoice?.status || null,
            invoiceAmount: apt.invoice?.totalAmount ? (+(apt.invoice.totalAmount)) : 0,
            avatar: this.getInitials(patientName),
            color: apt.color || 'from-blue-500 to-indigo-600'
          };
        } catch (innerError) {
          console.error("Error mapping individual appointment:", innerError);
          return this.getSafeFallback(apt.id);
        }
      });
    } catch (error) {
      console.error("[AppointmentService] Failed to fetch appointments list:", error);
      return [];
    }
  }

  async getAppointmentsData(tenantId: string) {
    try {
      this.validateTenant(tenantId);
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Fetch today's appointments efficiently for accurate daily stats
      const todayAptsRaw = await this.appointmentRepository.findMany(tenantId, {
        where: {
          date: {
            gte: todayStart,
            lte: todayEnd
          }
        },
        take: 1000
      });
      
      const list = await this.getAppointmentsList(tenantId);

      const stats = {
        totalToday: todayAptsRaw.length,
        completed: todayAptsRaw.filter(a => a.status === 'COMPLETED').length,
        inProgress: todayAptsRaw.filter(a => a.status === 'IN_PROGRESS').length,
        cancelled: todayAptsRaw.filter(a => a.status === 'CANCELLED').length
      };

      return {
        list,
        stats
      };
    } catch (error) {
      console.error("[AppointmentService] Failed to get appointments data:", error);
      return { list: [], stats: { totalToday: 0, completed: 0, inProgress: 0, cancelled: 0 } };
    }
  }

  /**
   * Get all data needed for creation forms (doctors, services)
   */
  async getAppointmentFormData(tenantId: string) {
    try {
      this.validateTenant(tenantId);
      const doctors = await this.staffRepository.findStaff(tenantId, 'DOCTOR', { id: true, name: true });
      const servicesRaw = await this.serviceRepository.findMany(tenantId, { select: { id: true, name: true, duration: true, price: true } });
      const rooms = await prisma.room.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          name: true,
          roomChairs: {
            where: { isActive: true },
            select: { id: true, name: true }
          }
        }
      });

      const services = (servicesRaw || []).map(s => ({
        ...s,
        price: s.price ? (+(s.price)) : 0
      }));

      return {
        doctors: doctors || [],
        services: services || [],
        rooms: rooms || []
      };
    } catch (error) {
      console.error("[AppointmentService] Failed to get form data:", error);
      return { doctors: [], services: [], rooms: [] };
    }
  }

  /**
   * Get detailed info for a single appointment
   */
  async getAppointmentDetails(tenantId: string, id: string) {
    try {
      this.validateTenant(tenantId);
      if (!id) return this.getSafeFallback();
      const apt = await this.appointmentRepository.findUnique(tenantId, id);
      if (!apt) return this.getSafeFallback(id);
      return this.serializeAppointment(apt);
    } catch (error) {
      console.error(`[AppointmentService] Failed to fetch appointment ${id}:`, error);
      return this.getSafeFallback(id);
    }
  }

  async createAppointment(tenantId: string, data: {
    patientId: string;
    doctorId: string;
    serviceId?: string;
    date: string; 
    time: string; 
    duration: number;
    treatment: string;
    notes?: string;
    color?: string;
    roomId?: string;
    chairId?: string;
  }) {
    try {
      this.validateTenant(tenantId);
      console.log(`[AppointmentService] Creating appointment for tenant: ${tenantId}`, data);
      
      const timeDate = new Date();
      const [hours, minutes] = (data.time || "09:00").split(':');
      timeDate.setHours((+(hours || "9")), (+(minutes || "0")), 0, 0);

      // --- Room Scheduling Engine Validation ---
      if (data.roomId) {
        await RoomService.validateRoomBooking(tenantId, {
          roomId: data.roomId,
          chairId: data.chairId,
          doctorId: data.doctorId,
          date: new Date(data.date),
          time: timeDate,
          duration: data.duration
        });
      }

      const result = await this.appointmentRepository.create(tenantId, {
        patientId: data.patientId,
        doctorId: data.doctorId,
        serviceId: data.serviceId,
        date: new Date(data.date),
        time: timeDate,
        duration: data.duration || 30,
        treatment: this.normalizeString(data.treatment, "Standard Treatment"),
        notes: data.notes || "",
        color: data.color || "from-blue-500 to-indigo-600",
        roomId: data.roomId,
        chairId: data.chairId,
        status: 'SCHEDULED'
      });

      const serialized = this.serializeAppointment(result);

      // Trigger Notification
      await this.notificationService.notifyEvent(tenantId, 'APPOINTMENT_REMINDER', {
        userId: data.doctorId,
        patientName: serialized.patient || "Patient",
        time: data.time,
        metadata: { appointmentId: result.id }
      });

      return serialized;
    } catch (error) {
      console.error("[AppointmentService] Failed to create appointment:", error);
      throw error;
    }
  }

  /**
   * Assign a room and chair to an appointment
   */
  async assignRoom(tenantId: string, id: string, roomId: string, chairId?: string) {
    try {
      this.validateTenant(tenantId);
      
      const apt = await this.appointmentRepository.findUnique(tenantId, id);
      if (!apt) throw new Error("Appointment not found");

      // Validate overlap
      await RoomService.validateRoomBooking(tenantId, {
        roomId,
        chairId,
        doctorId: apt.doctorId,
        date: apt.date,
        time: apt.time,
        duration: apt.service?.duration || 30,
        excludeAppointmentId: id
      });

      // Update
      const updated = await this.appointmentRepository.update(tenantId, id, {
        roomId,
        chairId: chairId || null
      });

      return this.serializeAppointment(updated);
    } catch (error) {
      console.error(`[AppointmentService] Failed to assign room for appointment ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update appointment status and handle automatic triggers
   */
  async updateStatus(tenantId: string, id: string, status: AppointmentStatus) {
    try {
      this.validateTenant(tenantId);
      // 1. Fetch current appointment to get serviceId
      const appointment = await this.appointmentRepository.findUnique(tenantId, id);
      
      // 2. Update status
      const updated = await this.appointmentRepository.update(tenantId, id, { status });

      // 3. If completed, trigger smart logic
      if (status === 'COMPLETED' && appointment?.serviceId) {
        try {
          await this.inventoryService.consumeItemsFromService(tenantId, appointment.serviceId);
        } catch (invError) {
          console.error("[AppointmentService] Inventory consumption failed but status was updated:", invError);
        }
      }

      return this.serializeAppointment(updated);
    } catch (error) {
      console.error(`[AppointmentService] Failed to update status for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Cancel/Delete appointment
   */
  async cancelAppointment(tenantId: string, id: string) {
    try {
      this.validateTenant(tenantId);
      const result = await this.appointmentRepository.delete(tenantId, id);
      return this.serializeAppointment(result);
    } catch (error) {
      console.error(`[AppointmentService] Failed to cancel appointment ${id}:`, error);
      throw error;
    }
  }

  /**
   * Helper to serialize appointment objects for Client Components
   */
  private serializeAppointment(apt: any) {
    if (!apt) return this.getSafeFallback();
    
    try {
      const serialized = { ...apt };
      
      if (serialized.service) {
        serialized.service = {
          ...serialized.service,
          price: serialized.service.price ? (+(serialized.service.price)) : 0
        };
      }
      
      if (serialized.invoice) {
        serialized.invoice = {
          ...serialized.invoice,
          totalAmount: serialized.invoice.totalAmount ? (+(serialized.invoice.totalAmount)) : 0
        };
      }

      if (serialized.date instanceof Date) serialized.date = serialized.date.toISOString();
      if (serialized.time instanceof Date) serialized.time = serialized.time.toISOString();
      if (serialized.createdAt instanceof Date) serialized.createdAt = serialized.createdAt.toISOString();
      if (serialized.updatedAt instanceof Date) serialized.updatedAt = serialized.updatedAt.toISOString();

      return serialized;
    } catch (error) {
      console.error("[AppointmentService] Serialization failed:", error);
      return this.getSafeFallback(apt.id);
    }
  }
}
