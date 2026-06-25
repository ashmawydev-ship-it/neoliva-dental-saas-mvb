export const dynamic = "force-dynamic";

import { AddPatientDialog } from "@/components/patients/AddPatientDialog";
import { PatientsTable } from "@/components/patients/PatientsTable";
import { PatientService } from "@/services/patient.service";
import { resolveTenantContextOrRedirect as resolveTenantContext } from "@/lib/auth/resolve-tenant-context";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

const patientService = new PatientService();

const PATIENTS_PER_PAGE = 15;

async function PatientsListContent({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const { tenantId } = await resolveTenantContext();

  const params  = await searchParams;
  const page    = Math.max(1, parseInt(params.page   ?? "1",  10) || 1);
  const search  = (params.search ?? "").trim();

  const { patients, total, totalPages } = await patientService.getPatientsPaginated(
    tenantId,
    { page, limit: PATIENTS_PER_PAGE, search }
  );

  const t = await getTranslations("patients");

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('registered', { count: total })}
          </p>
        </div>
        <AddPatientDialog />
      </div>

      <PatientsTable
        initialPatients={patients}
        total={total}
        totalPages={totalPages}
        currentPage={page}
        currentSearch={search}
        searchPlaceholder={t('searchPlaceholder')}
      />
    </>
  );
}

interface PatientsPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default function PatientsPage({ searchParams }: PatientsPageProps) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <Suspense fallback={
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Skeleton className="h-9 w-32 mb-1 rounded-md" />
              <Skeleton className="h-4 w-40 rounded-md" />
            </div>
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
          <Skeleton className="w-full h-96 rounded-xl" />
        </>
      }>
        <PatientsListContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
