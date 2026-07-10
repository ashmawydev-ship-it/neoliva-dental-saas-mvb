import { PaymentMethod, InvoiceStatus, StaffRole } from '../src/generated/client';
import { rawPrisma as prisma } from '../src/lib/prisma';

async function main() {
  console.log("Starting database seeding...");

  // 1. Get or create a default tenant
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "Demo Clinic",
        slug: "demo-clinic",
        status: "APPROVED"
      }
    });
    console.log("Created Tenant:", tenant.name);
  }

  // 2. Create a Doctor ('devss')
  let doctor = await prisma.staff.findFirst({
    where: { role: StaffRole.DOCTOR, tenantId: tenant.id }
  });
  
  if (!doctor) {
    doctor = await prisma.staff.create({
      data: {
        tenantId: tenant.id,
        name: "Dr. Devss",
        email: "devss@example.com",
        role: StaffRole.DOCTOR,
        commissionRate: 30, // 30% commission
      }
    });
    console.log("Created Doctor:", doctor.name);
  } else {
    // Ensure doctor has commission rate
    doctor = await prisma.staff.update({
      where: { id: doctor.id },
      data: { commissionRate: 30 }
    });
    console.log("Updated Doctor:", doctor.name);
  }

  // 3. Create a Dummy Patient
  let patient = await prisma.patient.findFirst({
    where: { tenantId: tenant.id }
  });

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        tenantId: tenant.id,
        name: "John Doe",
      }
    });
    console.log("Created Patient:", patient.name);
  }

  // 4. Create an Invoice assigned to the Doctor
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      doctorId: doctor.id,
      totalAmount: 1000,
      paidAmount: 0,
      status: InvoiceStatus.PENDING,
      items: {
        create: [
          {
            tenantId: tenant.id,
            description: "Dummy Root Canal",
            quantity: 1,
            unitPrice: 1000,
            total: 1000
          }
        ]
      }
    }
  });
  console.log("Created Invoice:", invoice.id);

  // 5. Create a FULL Payment to trigger commissions
  const payment = await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      invoiceId: invoice.id,
      amount: 1000,
      method: PaymentMethod.CASH,
      notes: "Seeded Payment for E2E testing",
    }
  });
  
  // 6. Update the invoice status
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { 
      paidAmount: 1000, 
      status: InvoiceStatus.PAID 
    }
  });
  console.log("Recorded Payment:", payment.id);

  // 7. Calculate and insert Doctor Commission manually (since seed bypasses service layer)
  const commission = await prisma.doctorCommission.create({
    data: {
      tenantId: tenant.id,
      doctorId: doctor.id,
      invoiceId: invoice.id,
      paymentId: payment.id,
      invoiceAmount: 1000,
      commissionRate: 30,
      commissionAmount: 300,
      status: "pending"
    }
  });
  console.log("Created Doctor Commission:", commission.id);
  
  console.log("Database seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
