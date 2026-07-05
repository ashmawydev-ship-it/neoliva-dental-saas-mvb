import "server-only";
import { PatientRepository } from "@/repositories/patient.repository";
import { Prisma } from "@/generated/client";

export class PatientService {
  static instance?: PatientService;

  constructor(
    private readonly patientRepository = new PatientRepository()
  ) {}
  private normalizeString(val: string | null | undefined, fallback: string = "-"): string {
    if (!val || typeof val !== 'string') return fallback;
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  // ─── Patient Identity Factory ───────────────────────────────────────────────

  /**
   * getInitials — Derives avatar initials from a patient's display name.
   * Single-word names use the first two characters; multi-word names use
   * first + last initial. Moved here from the Server Action layer.
   */
  private getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '??';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  /**
   * pickGradient — Deterministically selects an avatar colour gradient based
   * on the patient's name so that the same patient always gets the same colour
   * on re-creation (rather than a random one on each save).
   * Moved here from the Server Action layer.
   */
  private static readonly AVATAR_GRADIENTS = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-purple-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-red-600',
  ] as const;

  private pickGradient(name: string): string {
    const index = (name || '').length % PatientService.AVATAR_GRADIENTS.length;
    return PatientService.AVATAR_GRADIENTS[index];
  }

  /**
   * buildCreateInput
   *
   * Canonical factory for all fields that must be enriched before a new
   * Patient record is persisted. Accepts raw, unvalidated form data from the
   * Server Action layer and returns a fully-formed create-input object.
   *
   * Business rules owned here:
   * - `displayId`      — "P-NNNN" formatted random 4-digit suffix
   * - `avatarInitials` — derived from patient name
   * - `colorGradient`  — deterministic gradient from name length
   * - `status`         — defaults to "Active" for new patients
   *
   * @param raw - Flat key-value map from FormData.entries()
   */
  buildCreateInput(raw: Record<string, any>) {
    const name = (raw.name as string)?.trim() || '';
    return {
      displayId:      `P-${Math.floor(1000 + Math.random() * 9000)}`,
      name,
      phone:          raw.phone1 as string,
      phone2:         (raw.phone2 as string) || null,
      email:          (raw.email as string) || null,
      address:        (raw.address as string) || null,
      postCode:       (raw.postCode as string) || null,
      city:           (raw.city as string) || null,
      dob:            raw.dob ? new Date(raw.dob as string) : null,
      gender:         (raw.gender as string) || null,
      maritalStatus:  (raw.maritalStatus as string) || null,
      occupation:     (raw.occupation as string) || null,
      insurance:      (raw.insurance as string) || null,
      ssn:            (raw.ssn as string) || null,
      idNumber:       (raw.idNumber as string) || null,
      medicalAlert:   (raw.medicalAlert as string) || null,
      referredBy:     (raw.referredBy as string) || null,
      notes:          (raw.notes as string) || null,
      isDeceased:     raw.isDeceased === 'true',
      isSigned:       raw.isSigned === 'true',
      avatarInitials: this.getInitials(name),
      colorGradient:  this.pickGradient(name),
      status:         'Active',
    };
  }

  private mapSafePatient(patient: any): any {
    if (!patient) return this.getSafeFallback();
    try {
      return {
        ...patient,
        name: this.normalizeString(patient.name, "Unknown Patient"),
        phone: this.normalizeString(patient.phone, "-"),
        email: this.normalizeString(patient.email, "-"),
        status: patient.status || "Active",
        createdAt: patient.createdAt || new Date(),
      };
    } catch (error) {
      console.error("[PatientService.mapSafePatient] Error:", error);
      return this.getSafeFallback(patient?.id, patient?.tenantId);
    }
  }

  private getSafeFallback(id?: string, tenantId?: string): any {
    return {
      id: id || "unknown",
      tenantId: tenantId || null,
      displayId: "P-0000",
      name: "Unknown Patient",
      phone: "-",
      email: "-",
      status: "Inactive",
      createdAt: new Date(),
      appointments: [],
      invoices: [],
      visitRecords: [],
      patientDocuments: [],
      patientAllergies: [],
      medicalConditions: [],
      patientMedications: [],
      patientSurgeries: [],
      patientFamilyHistory: [],
      oralTissueFindings: [],
      toothConditions: [],
      periodontalSessions: [],
      prescriptions: [],
      oralConditions: [],
    };
  }

  async getAllPatients(tenantId: string) {
    try {
      if (!tenantId) return [];
      const patients = await this.patientRepository.findMany(tenantId, {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          displayId: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
        }
      });
      return (patients || []).map(p => this.mapSafePatient(p));
    } catch (error) {
      console.error("[PatientService.getAllPatients] Error:", error);
      return [];
    }
  }

  async getPatientsForSelection(tenantId: string) {
    try {
      if (!tenantId) return [];
      const data = await this.patientRepository.findMany(tenantId, {
        select: {
          id: true,
          displayId: true,
          name: true,
        },
        orderBy: { name: 'asc' }
      });
      
      const safeData = (data || []).map(p => ({
        id: p.id,
        displayId: p.displayId || "P-0000",
        name: this.normalizeString(p.name, "Unknown Patient"),
      }));

      return safeData;
    } catch (error) {
      console.error("[PatientService.getPatientsForSelection] Error:", error);
      return [];
    }
  }

  /**
   * getPatientsPaginated — Scalable, server-side paginated patient list.
   *
   * Fetches only one page of patients from the database using Prisma's `take`
   * and `skip`. Search is delegated to the database via `contains`. The total
   * count is fetched in parallel so neither query blocks the other.
   *
   * Replaces `getPatientsList` for the list-view page; retains no large
   * nested includes (appointments/invoices) since those are not needed in the
   * table row.
   */
  async getPatientsPaginated(
    tenantId: string,
    { page = 1, limit = 15, search = '' }: { page?: number; limit?: number; search?: string }
  ): Promise<{ patients: any[]; total: number; totalPages: number }> {
    try {
      if (!tenantId) return { patients: [], total: 0, totalPages: 0 };

      const safePage  = Math.max(1, page);
      const safeLimit = Math.min(Math.max(1, limit), 100); // cap at 100 per page
      const skip      = (safePage - 1) * safeLimit;

      // Build the shared where clause — search is pushed down to the DB
      const where = search.trim()
        ? {
            OR: [
              { name:      { contains: search, mode: 'insensitive' as const } },
              { phone:     { contains: search, mode: 'insensitive' as const } },
              { displayId: { contains: search, mode: 'insensitive' as const } },
              { email:     { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      // Fetch the page and the total count in a single round-trip via Promise.all
      const [data, total] = await Promise.all([
        this.patientRepository.findMany(tenantId, {
          skip,
          take: safeLimit,
          orderBy: { createdAt: 'desc' },
          where,
          select: {
            id:             true,
            displayId:      true,
            name:           true,
            email:          true,
            phone:          true,
            gender:         true,
            status:         true,
            createdAt:      true,
            avatarInitials: true,
            colorGradient:  true,
            // Lean aggregate fields — no full arrays loaded into memory
            _count: {
              select: { appointments: true },
            },
          },
        }),
        this.patientRepository.count(tenantId, where),
      ]);

      const patients = (data || []).map((patient: any) => {
        try {
          const name = this.normalizeString(patient.name, 'Unknown Patient');
          return {
            id:              patient.id,
            displayId:       patient.displayId || 'P-0000',
            name,
            email:           this.normalizeString(patient.email, '—'),
            phone:           this.normalizeString(patient.phone, '—'),
            gender:          patient.gender,
            status:          patient.status || 'Active',
            visits:          patient._count?.appointments ?? 0,
            avatar:          patient.avatarInitials || this.getInitials(name),
            color:           patient.colorGradient  || 'from-blue-500 to-indigo-600',
            registeredSince: patient.createdAt
              ? new Date(patient.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              : '—',
            // lastVisit / nextAppt are not available without loading relations;
            // kept as static strings to preserve the table's column contract.
            lastVisit: '—',
            nextAppt:  '—',
            outstanding: 0,
          };
        } catch (innerError) {
          console.error(`[PatientService.getPatientsPaginated] Mapping error for patient ${patient?.id}:`, innerError);
          return { id: patient?.id || 'unknown', name: 'Error Loading' };
        }
      });

      return {
        patients,
        total,
        totalPages: Math.ceil(total / safeLimit),
      };
    } catch (error) {
      console.error('[PatientService.getPatientsPaginated] Error:', error);
      return { patients: [], total: 0, totalPages: 0 };
    }
  }

  async getPatientsList(tenantId: string) {
    try {
      if (!tenantId) return [];
      const data = await this.patientRepository.findMany(tenantId, {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          displayId: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          appointments: {
            select: {
              date: true,
              status: true
            }
          },
          invoices: {
            select: {
              totalAmount: true,
              paidAmount: true
            }
          }
        }
      });
      
      const result = (data || []).map((patient: any) => {
        try {
          const appts = patient.appointments || []
          const nextAppt = appts
            .filter((a: any) => a.date && new Date(a.date) > new Date() && a.status !== 'Cancelled')
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]

          const lastVisit = appts
            .filter((a: any) => a.date && new Date(a.date) < new Date() && a.status === 'Completed')
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

          const getInitials = (name: string) => {
            if (!name) return '??';
            const parts = name.trim().split(/\s+/).filter(Boolean);
            if (parts.length === 0) return '??';
            if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
          }

          const name = this.normalizeString(patient.name, "Unknown Patient");

          return {
            id: patient.id,
            displayId: patient.displayId || "P-0000",
            name: name,
            email: this.normalizeString(patient.email, "—"),
            phone: this.normalizeString(patient.phone, "—"),
            gender: patient.gender,
            lastVisit: lastVisit ? new Date(lastVisit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No visits',
            nextAppt: nextAppt ? new Date(nextAppt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled',
            status: patient.status || 'Active',
            visits: appts.filter((a: any) => a.status === 'Completed').length,
            avatar: patient.avatarInitials || getInitials(name),
            color: patient.colorGradient || 'from-blue-500 to-indigo-600',
            registeredSince: patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—',
            outstanding: (patient.invoices || [])
              .reduce((sum: number, i: any) => {
                const paid = (+(i.paidAmount || 0));
                const total = (+(i.totalAmount || 0));
                return sum + (total - paid);
              }, 0)
          }
        } catch (innerError) {
          console.error(`[PatientService.getPatientsList] Mapping error for patient ${patient?.id}:`, innerError);
          return { id: patient?.id || "unknown", name: "Error Loading" };
        }
      });

      return result;
    } catch (error) {
      console.error("[PatientService.getPatientsList] Error:", error);
      return [];
    }
  }

  async getPatientById(tenantId: string, id: string) {
    if (process.env.AUTH_DEBUG === 'true') {
      console.log(`[AUTH_DEBUG][PatientService.getPatientById] REQUESTED: id=${id} | tenantId=${tenantId}`);
    }
    try {
      if (!id || !tenantId) {
        return this.getSafeFallback(id, tenantId);
      }

      // 1. Repository Check (Truth Verification - debug only)
      if (process.env.AUTH_DEBUG === 'true') {
        const rawPatient = await this.patientRepository.findUniqueGlobal(id);
        console.log("[AUTH_DEBUG][PATIENT_DATABASE_REALITY]", {
          id: rawPatient?.id,
          actualTenantId: rawPatient?.tenantId,
          requestedTenantId: tenantId,
          match: rawPatient?.tenantId === tenantId
        });
      }

      // Combine both core and clinical queries into a single database findUnique call
      const data = await this.patientRepository.findUnique(tenantId, id, {
        id: true,
        displayId: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        dob: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        tenantId: true,
        appointments: true,
        invoices: {
          where: { tenantId },
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
            payments: true,
            tenantId: true
          }
        },
        visitRecords: true,
        patientDocuments: true,
        patientAllergies: true,
        medicalConditions: true,
        patientMedications: true,
        patientSurgeries: true,
        patientFamilyHistory: true,
        oralTissueFindings: true,
        toothConditions: true,
        periodontalSessions: {
          include: {
            measurements: true
          },
          orderBy: {
            date: 'desc'
          }
        },
        prescriptions: {
          select: {
            id: true,
            date: true,
            notes: true,
            items: true
          }
        },
        oralConditions: true,
      });

      if (!data) {
        if (process.env.AUTH_DEBUG === 'true') {
          console.error(`[AUTH_DEBUG][PatientService.getPatientById] Patient not found in DB: ${id} for tenant: ${tenantId}`);
        }
        return this.getSafeFallback(id, tenantId);
      }

      const result = {
        ...data,
        name: this.normalizeString(data.name, "Unknown Patient"),
        phone: this.normalizeString(data.phone, "-"),
        email: this.normalizeString(data.email, "-"),
        patientAllergies: data.patientAllergies ?? [],
        medicalConditions: data.medicalConditions ?? [],
        patientMedications: data.patientMedications ?? [],
        patientSurgeries: data.patientSurgeries ?? [],
        patientFamilyHistory: data.patientFamilyHistory ?? [],
        oralTissueFindings: data.oralTissueFindings ?? [],
        toothConditions: data.toothConditions ?? [],
        periodontalSessions: data.periodontalSessions ?? [],
        prescriptions: data.prescriptions ?? [],
        oralConditions: data.oralConditions ?? [],
        appointments: data.appointments ?? [],
        invoices: data.invoices ?? [],
        visitRecords: data.visitRecords ?? [],
        patientDocuments: data.patientDocuments ?? [],
      };

      return result;
    } catch (error) {
      console.error(`[PatientService.getPatientById] Error fetching patient ${id}:`, error);
      return this.getSafeFallback(id);
    }
  }

  async createPatient(tenantId: string, data: Omit<Prisma.PatientUncheckedCreateInput, 'tenantId'>) {
    try {
      if (!tenantId) throw new Error("tenantId is required");
      const normalizedData = {
        ...data,
        name: data.name?.trim() || "Unknown Patient",
        phone: data.phone?.trim() || "-",
        email: data.email?.trim() || null,
      };
      const result = await this.patientRepository.create(tenantId, normalizedData);
      return this.mapSafePatient(result);
    } catch (error) {
      console.error("[PatientService.createPatient] Error:", error);
      return this.getSafeFallback();
    }
  }

  async updatePatient(tenantId: string, id: string, data: Prisma.PatientUpdateInput) {
    try {
      if (!tenantId || !id) throw new Error("tenantId and id are required");
      const normalizedData = { ...data };
      if (typeof data.name === 'string') normalizedData.name = data.name.trim();
      if (typeof data.phone === 'string') normalizedData.phone = data.phone.trim();
      if (typeof data.email === 'string') normalizedData.email = data.email.trim() || null;

      const result = await this.patientRepository.update(tenantId, id, normalizedData);
      return this.mapSafePatient(result);
    } catch (error) {
      console.error(`[PatientService.updatePatient] Error updating patient ${id}:`, error);
      return this.getSafeFallback(id);
    }
  }

  async deletePatient(tenantId: string, id: string) {
    try {
      if (!tenantId || !id) return false;
      return await this.patientRepository.delete(tenantId, id);
    } catch (error) {
      console.error(`[PatientService.deletePatient] Error deleting patient ${id}:`, error);
      return false;
    }
  }

  async getPatientProfile(tenantId: string, id: string) {
    try {
      if (!id || !tenantId) return this.getSafeFallback(id, tenantId);

      const data = await this.getPatientById(tenantId, id);
      
      const dobDate = data.dob ? new Date(data.dob) : null;
      const age = dobDate ? Math.floor((new Date().getTime() - dobDate.getTime()) / 31557600000) : null
      
      const appointments = data.appointments || []
      const pastAppts = appointments
        .filter((a: any) => a.date && new Date(a.date) < new Date() && a.status === 'Completed')
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

      const futureAppts = appointments
        .filter((a: any) => a.date && new Date(a.date) > new Date() && a.status !== 'Cancelled')
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const invoices = data.invoices || []
      const totalOutstanding = invoices.reduce((sum: number, inv: any) => {
        const actualPaidAmount = (inv.payments || []).reduce((acc: number, p: any) => acc + (+(p.amount)), 0);
        return sum + Math.max(0, (+(inv.totalAmount)) - actualPaidAmount);
      }, 0)

      const getInitials = (name: string) => {
        if (!name) return '??';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '??';
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }

      const name = this.normalizeString(data.name, "Unknown Patient");
      const avatar = data.avatarInitials || getInitials(name)

      const colors = [
        'from-blue-500 to-cyan-500',
        'from-purple-500 to-pink-500',
        'from-amber-500 to-orange-500',
        'from-emerald-500 to-teal-500',
        'from-indigo-500 to-violet-500',
        'from-rose-500 to-red-500'
      ];
      const colorIndex = (name || '').length % colors.length;

      const visitHistory = [
        ...(data.visitRecords || []).map((vr: any) => ({
          id: vr.id,
          date: vr.date ? new Date(vr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
          time: '',
          status: 'Completed',
          treatment: vr.treatment,
          doctor: vr.doctor,
          notes: vr.notes || '',
          tooth: vr.tooth || '',
          isClinicalRecord: true
        })),
        ...appointments.map((a: any) => ({
          id: a.id,
          date: a.date ? new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
          time: a.time || '—',
          status: a.status,
          treatment: a.treatment || '—',
          notes: a.notes || "No notes",
          isClinicalRecord: false
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const result = {
        id: data.id,
        displayId: data.displayId || "P-0000",
        name: name,
        phone: this.normalizeString(data.phone, "—"),
        phone2: this.normalizeString(data.phone2, "—"),
        email: this.normalizeString(data.email, "—"),
        dob: dobDate ? `${dobDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${age} years)` : '—',
        address: this.normalizeString(data.address, "—"),
        city: this.normalizeString(data.city, "—"),
        postCode: this.normalizeString(data.postCode, "—"),
        maritalStatus: this.normalizeString(data.maritalStatus, "—"),
        occupation: this.normalizeString(data.occupation, "—"),
        insurance: this.normalizeString(data.insurance, "—"),
        ssn: this.normalizeString(data.ssn, "—"),
        idNumber: this.normalizeString(data.idNumber, "—"),
        medicalAlert: this.normalizeString(data.medicalAlert, "None"),
        referredBy: this.normalizeString(data.referredBy, "Direct"),
        notes: this.normalizeString(data.notes, "No notes"),
        isDeceased: !!data.isDeceased,
        isSigned: !!data.isSigned,
        lastVisit: pastAppts.length > 0 ? new Date(pastAppts[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
        nextAppt: futureAppts.length > 0 ? new Date(futureAppts[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
        status: data.status || 'Active',
        avatar,
        color: data.colorGradient || colors[colorIndex],
        registeredSince: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—',
        outstanding: totalOutstanding,
        bloodGroup: data.bloodGroup || '',
        smokingStatus: data.smokingStatus || 'Never',
        alcoholUse: data.alcoholUse || 'None',
        generalMedicalNotes: data.medicalNotes || '',
        allergies: (data.patientAllergies || []).map((a: any) => ({ ...a })),
        conditions: (data.medicalConditions || []).map((c: any) => ({ ...c })),
        medications: (data.patientMedications || []).map((m: any) => ({ ...m })),
        surgeries: (data.patientSurgeries || []).map((s: any) => ({ ...s })),
        familyHistory: (data.patientFamilyHistory || []).map((fh: any) => ({ ...fh })),
        oralTissueFindings: (data.oralTissueFindings || []).map((ot: any) => ({ ...ot })),
        toothConditions: (data.toothConditions || []).map((tc: any) => ({ ...tc })),
        periodontalSessions: (data.periodontalSessions || []).map((ps: any) => ({
          ...ps,
          measurements: (ps.measurements || []).map((pm: any) => ({ ...pm }))
        })),
        oralConditions: (data.oralConditions || []).map((oc: any) => ({ ...oc })),
        visitHistory,
        invoiceHistory: (invoices || []).map((i: any) => {
          const totalAmount = (+(i.totalAmount || 0))
          const actualPaidAmount = (i.payments || []).reduce((acc: number, p: any) => acc + (+(p.amount)), 0)
          const remainingAmount = Math.max(0, totalAmount - actualPaidAmount)
          
          let derivedStatus = i.status
          if (remainingAmount <= 0) {
            derivedStatus = 'PAID'
          } else if (actualPaidAmount > 0) {
            derivedStatus = 'PARTIAL'
          } else if (remainingAmount > 0 && i.status === 'PAID') {
            derivedStatus = 'PENDING'
          }

          return {
            id: i.id,
            displayId: i.displayId || `INV-${i.id.slice(0, 8).toUpperCase()}`,
            totalAmount: totalAmount,
            paidAmount: actualPaidAmount,
            remainingAmount: remainingAmount,
            status: derivedStatus,
            dueDate: i.dueDate ? new Date(i.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
            createdAt: i.createdAt,
            items: (i.items || []).map((item: any) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              price: (+(item.unitPrice || item.price || 0)),
              discount: (+(item.discount || 0)),
              total: (+(item.total || 0)),
              createdAt: item.createdAt
            })),
            payments: (i.payments || []).map((p: any) => ({
              id: p.id,
              amount: (+(p.amount)),
              paidAt: p.paidAt,
              method: p.method,
              createdAt: p.createdAt
            }))
          }
        }),
        patient_documents: (data.patientDocuments || []).map((doc: any) => ({ ...doc })),
        prescriptions: (data.prescriptions || []).map((rx: any) => ({
          ...rx,
          items: (rx.items || []).map((item: any) => ({ ...item }))
        })),
        tenantId: data.tenantId, // CRITICAL FIX: Ensure tenantId is propagated for authorization checks
      };

      return result;
    } catch (error) {
      console.error('[PatientService.getPatientProfile] Error:', error);
      return this.getSafeFallback(id);
    }
  }

  // Sub-module methods
  async updateOralCondition(tenantId: string, patientId: string, name: string, active: boolean) {
    try {
      if (!tenantId || !patientId) return null;
      const result = await this.patientRepository.upsertOralCondition(tenantId, patientId, name, active);
      return result;
    } catch (error) {
      console.error("[PatientService.updateOralCondition] Error:", error);
      return null;
    }
  }

  async updateOralTissue(tenantId: string, patientId: string, name: string, status: string, notes: string) {
    try {
      if (!tenantId || !patientId) return null;
      const result = await this.patientRepository.upsertOralTissue(tenantId, patientId, name, status, notes);
      return result;
    } catch (error) {
      console.error("[PatientService.updateOralTissue] Error:", error);
      return null;
    }
  }

  async addVisitRecord(tenantId: string, patientId: string, data: any) {
    try {
      if (!tenantId || !patientId) return null;
      const result = await this.patientRepository.createVisitRecord(tenantId, patientId, data);
      return result;
    } catch (error) {
      console.error("[PatientService.addVisitRecord] Error:", error);
      return null;
    }
  }

  async deleteVisitRecord(tenantId: string, id: string) {
    try {
      if (!tenantId || !id) return false;
      return await this.patientRepository.deleteVisitRecord(tenantId, id);
    } catch (error) {
      console.error("[PatientService.deleteVisitRecord] Error:", error);
      return false;
    }
  }

  async updateToothCondition(tenantId: string, patientId: string, toothNumber: number, condition: string, isMissing: boolean, notes: string) {
    try {
      if (!tenantId || !patientId) return null;
      const result = await this.patientRepository.upsertToothCondition(tenantId, patientId, toothNumber, condition, isMissing, notes);
      return result;
    } catch (error) {
      console.error("[PatientService.updateToothCondition] Error:", error);
      return null;
    }
  }

  async getPeriodontalSessions(tenantId: string, patientId: string) {
    try {
      if (!tenantId || !patientId) return [];
      const result = await this.patientRepository.getPeriodontalSessionsByPatient(tenantId, patientId);
      return result;
    } catch (error) {
      console.error("[PatientService.getPeriodontalSessions] Error:", error);
      return [];
    }
  }

  async createPeriodontalSession(tenantId: string, patientId: string, examinerId?: string) {
    try {
      if (!tenantId || !patientId) return null;
      const result = await this.patientRepository.createPeriodontalSession(tenantId, patientId, examinerId);
      return result;
    } catch (error) {
      console.error("[PatientService.createPeriodontalSession] Error:", error);
      return null;
    }
  }

  async updatePeriodontalSession(tenantId: string, sessionId: string, data: any) {
    try {
      if (!tenantId || !sessionId) return null;
      const result = await this.patientRepository.updatePeriodontalSession(tenantId, sessionId, data);
      return result;
    } catch (error) {
      console.error("[PatientService.updatePeriodontalSession] Error:", error);
      return null;
    }
  }

  async deletePeriodontalSession(tenantId: string, sessionId: string) {
    try {
      if (!tenantId || !sessionId) return false;
      await this.patientRepository.deletePeriodontalSession(tenantId, sessionId);
      return true;
    } catch (error) {
      console.error("[PatientService.deletePeriodontalSession] Error:", error);
      return false;
    }
  }

  async updatePeriodontalMeasurement(tenantId: string, patientId: string, sessionId: string, data: any) {
    try {
      if (!tenantId || !patientId || !sessionId) return null;
      const result = await this.patientRepository.createPeriodontalMeasurement(tenantId, patientId, sessionId, data);
      
      // Calculate session metrics in the background (or we could await it)
      this.calculateSessionMetrics(tenantId, sessionId).catch(console.error);
      
      return result;
    } catch (error) {
      console.error("[PatientService.updatePeriodontalMeasurement] Error:", error);
      return null;
    }
  }

  async calculateSessionMetrics(tenantId: string, sessionId: string) {
    try {
      const session = await this.patientRepository.getPeriodontalSessionById(tenantId, sessionId);
      if (!session) return;
      
      const measurements = session.measurements || [];
      if (measurements.length === 0) return;
      
      // Calculate Average Pocket Depth
      let pdSum = 0;
      let pdCount = 0;
      
      // Calculate BOP Percentage
      let bopTotalSites = 0;
      let bopPositiveSites = 0;
      
      for (const m of measurements) {
        if (m.parameterName === 'PD') {
          const values = [...(m.buccalValues || []), ...(m.lingualValues || [])];
          for (const v of values) {
            if (typeof v === 'number') {
              pdSum += v;
              pdCount++;
            }
          }
        } else if (m.parameterName === 'BOP') {
          const values = [...(m.buccalValues || []), ...(m.lingualValues || [])];
          for (const v of values) {
            bopTotalSites++;
            // BOP might be saved as boolean (0/1) or true/false
            if (v === true || v === 1) {
              bopPositiveSites++;
            }
          }
        }
      }
      
      const averagePocketDepth = pdCount > 0 ? pdSum / pdCount : null;
      const bopPercentage = bopTotalSites > 0 ? (bopPositiveSites / bopTotalSites) * 100 : null;
      
      await this.patientRepository.updatePeriodontalSession(tenantId, sessionId, {
        averagePocketDepth,
        bopPercentage
      });
    } catch (error) {
      console.error("[PatientService.calculateSessionMetrics] Error:", error);
    }
  }

  async clearPeriodontalMeasurements(tenantId: string, patientId: string) {
    try {
      if (!tenantId || !patientId) return false;
      return await this.patientRepository.deleteAllPeriodontalMeasurements(tenantId, patientId);
    } catch (error) {
      console.error("[PatientService.clearPeriodontalMeasurements] Error:", error);
      return false;
    }
  }

  async addMedicalCondition(tenantId: string, patientId: string, data: any) {
    try {
      if (!tenantId || !patientId) return null;
      const result = await this.patientRepository.createMedicalCondition(tenantId, patientId, data);
      return result;
    } catch (error) {
      console.error("[PatientService.addMedicalCondition] Error:", error);
      return null;
    }
  }

  async deleteMedicalCondition(tenantId: string, id: string) {
    try {
      if (!tenantId || !id) return false;
      return await this.patientRepository.deleteMedicalCondition(tenantId, id);
    } catch (error) {
      console.error("[PatientService.deleteMedicalCondition] Error:", error);
      return false;
    }
  }

  async addAllergy(tenantId: string, patientId: string, data: any) {
    try {
      if (!tenantId || !patientId) return null;
      const result = await this.patientRepository.createAllergy(tenantId, patientId, data);
      return result;
    } catch (error) {
      console.error("[PatientService.addAllergy] Error:", error);
      return null;
    }
  }

  async deleteAllergy(tenantId: string, id: string) {
    try {
      if (!tenantId || !id) return false;
      return await this.patientRepository.deleteAllergy(tenantId, id);
    } catch (error) {
      console.error("[PatientService.deleteAllergy] Error:", error);
      return false;
    }
  }

  async addMedication(tenantId: string, patientId: string, data: any) {
    try {
      if (!tenantId || !patientId) return null;
      const result = await this.patientRepository.createMedication(tenantId, patientId, data);
      return result;
    } catch (error) {
      console.error("[PatientService.addMedication] Error:", error);
      return null;
    }
  }

  async deleteMedication(tenantId: string, id: string) {
    try {
      if (!tenantId || !id) return false;
      return await this.patientRepository.deleteMedication(tenantId, id);
    } catch (error) {
      console.error("[PatientService.deleteMedication] Error:", error);
      return false;
    }
  }

  async addSurgery(tenantId: string, patientId: string, data: any) {
    try {
      if (!tenantId || !patientId) return null;
      const result = await this.patientRepository.createSurgery(tenantId, patientId, data);
      return result;
    } catch (error) {
      console.error("[PatientService.addSurgery] Error:", error);
      return null;
    }
  }

  async deleteSurgery(tenantId: string, id: string) {
    try {
      if (!tenantId || !id) return false;
      return await this.patientRepository.deleteSurgery(tenantId, id);
    } catch (error) {
      console.error("[PatientService.deleteSurgery] Error:", error);
      return false;
    }
  }

  async addFamilyHistory(tenantId: string, patientId: string, data: any) {
    try {
      if (!tenantId || !patientId) return null;
      const result = await this.patientRepository.createFamilyHistory(tenantId, patientId, data);
      return result;
    } catch (error) {
      console.error("[PatientService.addFamilyHistory] Error:", error);
      return null;
    }
  }

  async deleteFamilyHistory(tenantId: string, id: string) {
    try {
      if (!tenantId || !id) return false;
      return await this.patientRepository.deleteFamilyHistory(tenantId, id);
    } catch (error) {
      console.error("[PatientService.deleteFamilyHistory] Error:", error);
      return false;
    }
  }

  async addPrescription(tenantId: string, patientId: string, data: any) {
    try {
      if (!tenantId || !patientId) return null;
      const result = await this.patientRepository.createPrescription(tenantId, patientId, data);
      return result;
    } catch (error) {
      console.error("[PatientService.addPrescription] Error:", error);
      return null;
    }
  }

  async deletePrescription(tenantId: string, id: string) {
    try {
      if (!tenantId || !id) return false;
      return await this.patientRepository.deletePrescription(tenantId, id);
    } catch (error) {
      console.error("[PatientService.deletePrescription] Error:", error);
      return false;
    }
  }

  async addDocument(tenantId: string, patientId: string, data: any) {
    try {
      if (!tenantId || !patientId) return null;
      const result = await this.patientRepository.createDocument(tenantId, patientId, data);
      return result;
    } catch (error) {
      console.error("[PatientService.addDocument] Error:", error);
      return null;
    }
  }

  async deleteDocument(tenantId: string, id: string) {
    try {
      if (!tenantId || !id) return false;
      return await this.patientRepository.deleteDocument(tenantId, id);
    } catch (error) {
      console.error("[PatientService.deleteDocument] Error:", error);
      return false;
    }
  }

  async updateInvoiceStatus(tenantId: string, id: string, status: string) {
    try {
      if (!tenantId || !id) return null;
      const result = await this.patientRepository.updateInvoice(tenantId, id, { status });
      return result;
    } catch (error) {
      console.error("[PatientService.updateInvoiceStatus] Error:", error);
      return null;
    }
  }

  async createInvoice(tenantId: string, patientId: string, data: any) {
    try {
      if (!tenantId || !patientId) return null;
      const result = await this.patientRepository.createInvoice(tenantId, patientId, data);
      return result;
    } catch (error) {
      console.error("[PatientService.createInvoice] Error:", error);
      return null;
    }
  }

  async addPayment(tenantId: string, invoiceId: string, data: any) {
    try {
      if (!tenantId || !invoiceId) return null;
      const result = await this.patientRepository.addPayment(tenantId, invoiceId, data);
      return result;
    } catch (error) {
      console.error("[PatientService.addPayment] Error:", error);
      return null;
    }
  }

  async deleteInvoice(tenantId: string, id: string) {
    try {
      if (!tenantId || !id) return false;
      return await this.patientRepository.deleteInvoice(tenantId, id);
    } catch (error) {
      console.error("[PatientService.deleteInvoice] Error:", error);
      return false;
    }
  }

  async searchPatients(tenantId: string, query: string) {
    try {
      if (!tenantId || !query) return [];
      const data = await this.patientRepository.findMany(tenantId, {
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ]
        },
        select: {
          id: true,
          displayId: true,
          name: true,
          phone: true,
        },
        take: 10,
        orderBy: { name: 'asc' }
      });
      return data;
    } catch (error) {
      console.error("[PatientService.searchPatients] Error:", error);
      return [];
    }
  }
}

