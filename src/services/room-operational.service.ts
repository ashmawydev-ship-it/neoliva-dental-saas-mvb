import { prisma } from "@/lib/prisma";
import { AppointmentStatus, RoomStatus } from "@/generated/client";

export class RoomOperationalService {
  static instance?: RoomOperationalService;

  constructor(
    private readonly prismaClient = prisma
  ) {}

  static async getLiveRoomStatus(tenantId: string) {
    return (RoomOperationalService.instance || new RoomOperationalService()).getLiveRoomStatus(tenantId);
  }
  static async startSession(tenantId: string, appointmentId: string) {
    return (RoomOperationalService.instance || new RoomOperationalService()).startSession(tenantId, appointmentId);
  }
  static async endSession(tenantId: string, appointmentId: string) {
    return (RoomOperationalService.instance || new RoomOperationalService()).endSession(tenantId, appointmentId);
  }
  static async transferAppointment(tenantId: string, appointmentId: string, targetRoomId: string) {
    return (RoomOperationalService.instance || new RoomOperationalService()).transferAppointment(tenantId, appointmentId, targetRoomId);
  }
  static async reorderQueue(tenantId: string, roomId: string, appointmentIds: string[]) {
    return (RoomOperationalService.instance || new RoomOperationalService()).reorderQueue(tenantId, roomId, appointmentIds);
  }
  static async prioritizeAppointment(tenantId: string, appointmentId: string) {
    return (RoomOperationalService.instance || new RoomOperationalService()).prioritizeAppointment(tenantId, appointmentId);
  }
  static async updateRoomStatus(tenantId: string, roomId: string, status: RoomStatus) {
    return (RoomOperationalService.instance || new RoomOperationalService()).updateRoomStatus(tenantId, roomId, status);
  }
  /**
   * Get all rooms with live operational data
   */
  async getLiveRoomStatus(tenantId: string) {
    const rooms = await this.prismaClient.room.findMany({
      where: { tenantId, isActive: true },
      include: {
        roomStaff: {
          include: {
            user: {
              include: {
                memberships: {
                  where: { tenantId },
                  include: { staffProfile: true }
                }
              }
            }
          }
        },
        appointments: {
          where: {
            OR: [
              { status: 'IN_PROGRESS' },
              { status: 'WAITING' },
              { status: 'SCHEDULED', date: new Date() }
            ]
          },
          include: {
            patient: true,
            doctor: true,
            service: true
          },
          orderBy: { time: 'asc' }
        },
        roomChairs: true
      }
    });

    return rooms.map(room => {
      const currentAppointment = room.appointments.find(a => a.status === 'IN_PROGRESS');
      const waitingQueue = room.appointments.filter(a => a.status === 'WAITING');
      const upcoming = room.appointments.filter(a => a.status === 'SCHEDULED');

      // Map staff by roles if possible, otherwise just list
      const staff = room.roomStaff.map(rs => ({
        userId: rs.userId,
        name: rs.user.memberships[0]?.staffProfile?.name || rs.user.email,
        role: rs.role || rs.user.memberships[0]?.role
      }));

      return {
        id: room.id,
        name: room.name,
        type: room.type,
        status: room.status,
        color: room.color,
        currentAppointment: currentAppointment ? {
          id: currentAppointment.id,
          patientName: currentAppointment.patient.name,
          doctorName: currentAppointment.doctor.name,
          serviceName: currentAppointment.service?.name || "Consultation",
          startTime: currentAppointment.actualStartTime,
          estimatedDuration: currentAppointment.duration
        } : null,
        queue: waitingQueue.map(q => ({
          id: q.id,
          patientName: q.patient.name,
          doctorName: q.doctor.name,
          time: q.time
        })),
        upcomingCount: upcoming.length,
        staff,
        chairs: room.roomChairs.map(c => ({ id: c.id, name: c.name, isActive: c.isActive }))
      };
    });
  }

  /**
   * Start a session (Status: IN_PROGRESS)
   */
  async startSession(tenantId: string, appointmentId: string) {
    return await this.prismaClient.appointment.update({
      where: { id: appointmentId, tenantId },
      data: {
        status: 'IN_PROGRESS',
        actualStartTime: new Date(),
        room: {
          update: { status: 'BUSY' }
        }
      }
    });
  }

  /**
   * End a session (Status: COMPLETED)
   */
  async endSession(tenantId: string, appointmentId: string) {
    const apt = await this.prismaClient.appointment.update({
      where: { id: appointmentId, tenantId },
      data: {
        status: 'COMPLETED',
        actualEndTime: new Date(),
        room: {
          update: { status: 'CLEANING' }
        }
      }
    });

    // Automatically set room back to AVAILABLE after 5 mins? 
    // For now keep it as CLEANING for operational awareness
    return apt;
  }

  /**
   * Transfer appointment between rooms
   */
  async transferAppointment(tenantId: string, appointmentId: string, targetRoomId: string) {
    return await this.prismaClient.appointment.update({
      where: { id: appointmentId, tenantId },
      data: {
        roomId: targetRoomId
      }
    });
  }

  /**
   * Reorder waiting queue for a specific room
   */
  async reorderQueue(tenantId: string, roomId: string, appointmentIds: string[]) {
    // To reorder, we update the 'time' field of each appointment to be 1 minute apart
    // starting from the earliest time in the queue for that room today.
    const appointments = await this.prismaClient.appointment.findMany({
      where: { id: { in: appointmentIds }, tenantId, roomId },
      orderBy: { time: 'asc' }
    });

    if (appointments.length === 0) return { success: true };

    const baseTime = appointments[0].time;
    
    const updates = appointmentIds.map((id, index) => {
      const newTime = new Date(baseTime);
      newTime.setMinutes(baseTime.getMinutes() + index);
      
      return this.prismaClient.appointment.update({
        where: { id, tenantId },
        data: { time: newTime }
      });
    });
    
    await Promise.all(updates);
    return { success: true };
  }

  /**
   * Prioritize an appointment (move to top of queue)
   */
  async prioritizeAppointment(tenantId: string, appointmentId: string) {
    const apt = await this.prismaClient.appointment.findUnique({
      where: { id: appointmentId, tenantId }
    });

    if (!apt || !apt.roomId) throw new Error("Appointment not found or not assigned to a room");

    // Find the current top of the queue for this room
    const topApt = await this.prismaClient.appointment.findFirst({
      where: { 
        roomId: apt.roomId, 
        tenantId,
        status: 'WAITING'
      },
      orderBy: { time: 'asc' }
    });

    if (!topApt || topApt.id === appointmentId) return { success: true };

    // Set time to topApt.time - 1 minute
    const newTime = new Date(topApt.time);
    newTime.setMinutes(topApt.time.getMinutes() - 1);

    await this.prismaClient.appointment.update({
      where: { id: appointmentId, tenantId },
      data: { time: newTime }
    });

    return { success: true };
  }

  /**
   * Update manual room status (e.g., from CLEANING to AVAILABLE)
   */
  async updateRoomStatus(tenantId: string, roomId: string, status: RoomStatus) {
    return await this.prismaClient.room.update({
      where: { id: roomId, tenantId },
      data: { status }
    });
  }
}
