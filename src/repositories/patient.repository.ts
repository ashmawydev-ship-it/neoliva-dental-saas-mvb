const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
import { prisma, rawPrisma } from "@/lib/prisma";
import { Patient, Prisma } from "@/generated/client";
import { getPagination } from "@/lib/pagination";

export class PatientRepository {
  /**
   * Enforces tenant isolation for all patient queries
   */
  async findMany(tenantId: string, params?: {
    skip?: number;
    take?: number;
    where?: Prisma.PatientWhereInput;
    orderBy?: Prisma.PatientOrderByWithRelationInput;
    select?: Prisma.PatientSelect;
  }): Promise<any[]> {
    const { take, skip } = getPagination(params);

    return prisma.patient.findMany({
      ...params,
      take,
      skip,
      where: {
        ...params?.where,
        tenantId,
      },
    });
  }

  async findUnique(tenantId: string, id: string, select?: Prisma.PatientSelect) {
    return prisma.patient.findFirst({
      where: { id, tenantId },
      select: select || {
        id: true,
        displayId: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        tenantId: true
      }
    });
  }

  async findUniqueGlobal(id: string) {
    return rawPrisma.patient.findUnique({
      where: { id },
      select: { id: true, tenantId: true, name: true }
    });
  }

  async create(tenantId: string, data: Omit<Prisma.PatientUncheckedCreateInput, 'tenantId'>) {
    return prisma.patient.create({
      data: {
        ...data,
        tenantId
      }
    });
  }

  async update(tenantId: string, id: string, data: Prisma.PatientUpdateInput) {
    return prisma.patient.update({
      where: { id, tenantId },
      data
    });
  }

  async delete(tenantId: string, id: string) {
    return prisma.patient.delete({
      where: { id, tenantId }
    });
  }

  async count(tenantId: string, where?: Prisma.PatientWhereInput): Promise<number> {
    return prisma.patient.count({
      where: {
        ...where,
        tenantId,
      },
    });
  }

  // Relations management with tenant isolation
  async upsertOralCondition(tenantId: string, patientId: string, name: string, active: boolean) {
    return prisma.oralCondition.upsert({
      where: {
        tenantId_patientId_name: { tenantId, patientId, name }
      },
      update: { active, updatedAt: new Date() },
      create: { patientId, name, active, tenantId }
    });
  }

  async upsertOralTissue(tenantId: string, patientId: string, name: string, status: string, notes: string) {
    return prisma.oralTissueFinding.upsert({
      where: {
        tenantId_patientId_name: { tenantId, patientId, name }
      },
      update: { status, notes, updatedAt: new Date() },
      create: { patientId, name, status, notes, tenantId }
    });
  }

  async createVisitRecord(tenantId: string, patientId: string, data: any) {
    return prisma.visitRecord.create({
      data: { ...data, patientId, tenantId }
    });
  }

  async deleteVisitRecord(tenantId: string, id: string) {
    return prisma.visitRecord.delete({
      where: { id, tenantId }
    });
  }

  async upsertToothCondition(tenantId: string, patientId: string, toothNumber: number, condition: string, isMissing: boolean, notes: string) {
    return prisma.toothCondition.upsert({
      where: {
        tenantId_patientId_toothNumber: { tenantId, patientId, toothNumber }
      },
      update: { condition, isMissing, notes, updatedAt: new Date() },
      create: { patientId, toothNumber, condition, isMissing, notes, tenantId }
    });
  }

  async getPeriodontalSessionsByPatient(tenantId: string, patientId: string) {
    return prisma.periodontalSession.findMany({
      where: { tenantId, patientId },
      orderBy: { date: 'desc' },
      include: {
        measurements: true
      },
        take: DEFAULT_PAGE_SIZE
    });
  }

  async getPeriodontalSessionById(tenantId: string, sessionId: string) {
    return prisma.periodontalSession.findFirst({
      where: { tenantId, id: sessionId },
      include: {
        measurements: true
      }
    });
  }

  async createPeriodontalSession(tenantId: string, patientId: string, examinerId?: string) {
    return prisma.periodontalSession.create({
      data: {
        tenantId,
        patientId,
        examinerId: examinerId || null,
        date: new Date()
      }
    });
  }

  async updatePeriodontalSession(tenantId: string, sessionId: string, data: any) {
    return prisma.periodontalSession.update({
      where: { id: sessionId, tenantId },
      data
    });
  }

  async deletePeriodontalSession(tenantId: string, sessionId: string) {
    return prisma.periodontalSession.delete({
      where: { id: sessionId, tenantId }
    });
  }

  async createPeriodontalMeasurement(tenantId: string, patientId: string, sessionId: string, data: any) {
    const patientExists = await prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: { id: true }
    });

    if (!patientExists) {
      throw new Error("Patient not found or unauthorized access.");
    }

    return prisma.periodontalMeasurement.upsert({
      where: {
        sessionId_toothNumber_parameterName: {
          sessionId,
          toothNumber: data.toothNumber,
          parameterName: data.parameterName,
        }
      },
      update: {
        buccalValues: data.buccalValues,
        lingualValues: data.lingualValues,
        singleValue: data.singleValue ?? null,
        measurementDate: data.measurementDate ?? new Date(),
      },
      create: {
        ...data,
        patientId,
        tenantId,
        sessionId
      }
    });
  }

  async deletePeriodontalMeasurement(tenantId: string, measurementId: string) {
    return prisma.periodontalMeasurement.delete({
      where: { id: measurementId, tenantId }
    });
  }

  async deleteAllPeriodontalMeasurements(tenantId: string, patientId: string) {
    return prisma.periodontalMeasurement.deleteMany({
      where: { patientId, tenantId }
    });
  }

  async createMedicalCondition(tenantId: string, patientId: string, data: any) {
    return prisma.medicalCondition.create({
      data: { ...data, patientId, tenantId }
    });
  }

  async deleteMedicalCondition(tenantId: string, id: string) {
    return prisma.medicalCondition.delete({
      where: { id, tenantId }
    });
  }

  async createAllergy(tenantId: string, patientId: string, data: any) {
    return prisma.patientAllergy.create({
      data: { ...data, patientId, tenantId }
    });
  }

  async deleteAllergy(tenantId: string, id: string) {
    return prisma.patientAllergy.delete({
      where: { id, tenantId }
    });
  }

  async createMedication(tenantId: string, patientId: string, data: any) {
    return prisma.patientMedication.create({
      data: { ...data, patientId, tenantId }
    });
  }

  async deleteMedication(tenantId: string, id: string) {
    return prisma.patientMedication.delete({
      where: { id, tenantId }
    });
  }

  async createSurgery(tenantId: string, patientId: string, data: any) {
    return prisma.patientSurgery.create({
      data: { ...data, patientId, tenantId }
    });
  }

  async deleteSurgery(tenantId: string, id: string) {
    return prisma.patientSurgery.delete({
      where: { id, tenantId }
    });
  }

  async createFamilyHistory(tenantId: string, patientId: string, data: any) {
    return prisma.patientFamilyHistory.create({
      data: { ...data, patientId, tenantId }
    });
  }

  async deleteFamilyHistory(tenantId: string, id: string) {
    return prisma.patientFamilyHistory.delete({
      where: { id, tenantId }
    });
  }

  async createPrescription(tenantId: string, patientId: string, data: any) {
    return prisma.prescription.create({
      data: {
        ...data,
        patientId,
        tenantId,
        items: {
          create: data.items
        }
      }
    });
  }

  async deletePrescription(tenantId: string, id: string) {
    return prisma.prescription.delete({
      where: { id, tenantId }
    });
  }

  async createDocument(tenantId: string, patientId: string, data: any) {
    return prisma.patientDocument.create({
      data: { 
        name: data.name,
        type: data.type,
        fileUrl: data.fileUrl,
        category: data.category || "other",
        uploadDate: data.uploadDate || new Date(),
        patientId, 
        tenantId 
      }
    });
  }

  async deleteDocument(tenantId: string, id: string) {
    return prisma.patientDocument.delete({
      where: { id, tenantId }
    });
  }

  async createInvoice(tenantId: string, patientId: string, data: any) {
    return prisma.invoice.create({
      data: {
        patientId,
        tenantId,
        totalAmount: data.amount,
        treatment: data.treatment,
        dueDate: data.dueDate,
        status: data.status || 'PENDING',
        items: {
          create: data.items.map((item: any) => {
            const unitPrice = new Prisma.Decimal(item.unitPrice || item.price || item.amount || 0);
            const quantity = new Prisma.Decimal(item.quantity || 1);
            return {
              description: item.description || item.name || "Service",
              unitPrice,
              quantity: item.quantity || 1,
              total: unitPrice.times(quantity),
              serviceId: item.serviceId || null,
              tenantId
            };
          })
        }
      },
      select: {
        id: true,
        displayId: true,
        patientId: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        dueDate: true,
        createdAt: true,
        items: true,
        updatedAt: true,
        tenantId: true,
        appointment: true,
      }
    });
  }

  async addPayment(tenantId: string, invoiceId: string, data: any) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch invoice with strict tenant isolation and necessary fields
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        select: {
          id: true,
          totalAmount: true,
          paidAmount: true,
          status: true
        }
      });

      if (!invoice) {
        throw new Error("Invoice not found or unauthorized access.");
      }

      if (invoice.status === "PAID") {
        throw new Error("This invoice is already fully paid.");
      }

      const totalAmount = new Prisma.Decimal(invoice.totalAmount as Prisma.Decimal);
      const currentPaid = new Prisma.Decimal(invoice.paidAmount as Prisma.Decimal);
      const remainingBalance = totalAmount.minus(currentPaid);
      const paymentAmount = new Prisma.Decimal(data.amount);

      // 2. Validate payment amount
      if (paymentAmount.greaterThan(remainingBalance)) {
        throw new Error(`Payment amount exceeds the remaining balance ($${remainingBalance.toFixed(2)}).`);
      }

      // 3. Create the Payment record
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount: paymentAmount,
          method: data.method,
          notes: data.notes,
          paidAt: data.date || new Date(),
          tenantId
        }
      });

      // 4. Calculate new state
      const newPaidAmount = currentPaid.plus(paymentAmount);
      let newStatus: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING';
      
      if (newPaidAmount.greaterThanOrEqualTo(totalAmount)) {
        newStatus = 'PAID';
      } else if (newPaidAmount.greaterThan(0)) {
        newStatus = 'PARTIAL';
      }

      // 5. Update the Invoice record
      await tx.invoice.update({
        where: { id: invoiceId, tenantId },
        data: { 
          paidAmount: newPaidAmount,
          status: newStatus,
          updatedAt: new Date()
        }
      });

      return payment;
    });
  }

  async deleteInvoice(tenantId: string, id: string) {
    return prisma.invoice.delete({
      where: { id, tenantId }
    });
  }

  async updateInvoice(tenantId: string, id: string, data: any) {
    return prisma.invoice.update({
      where: { id, tenantId },
      data
    });
  }
}
