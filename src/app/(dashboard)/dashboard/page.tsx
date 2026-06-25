import { getDashboardStats } from "@/app/actions/dashboard";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { OperationalPanel } from "@/components/dashboard/OperationalPanel";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { LayoutDashboard, Sparkles } from "lucide-react";
import { differenceInMinutes } from "date-fns";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cookies } from "next/headers";
import { formatDate } from "@/lib/format";
import { getTranslations } from "next-intl/server";

export const dynamic = 'force-dynamic';

async function DashboardContent() {
  const stats = await getDashboardStats();
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value || "en";
  const t = await getTranslations("dashboard");

  const queue = stats.upcomingAppointments.map((a: any) => {
    const timeComp = a.time instanceof Date ? a.time : new Date(a.time);
    const scheduledDateTime = new Date(a.date);
    scheduledDateTime.setHours(timeComp.getHours(), timeComp.getMinutes(), 0, 0);

    const waitTime = differenceInMinutes(new Date(), scheduledDateTime);
    
    return {
      id: a.id,
      patientName: a.patient?.name || "Unknown",
      doctorName: a.doctor?.name || "Unassigned",
      time: formatDate(scheduledDateTime, locale, { hour: '2-digit', minute: '2-digit' }),
      waitTime: waitTime > 0 ? waitTime : 0,
      status: a.status || "SCHEDULED"
    }
  });

  const activities = stats.recentPatients.map((p: any) => ({
    id: p.id,
    type: 'patient' as const,
    title: t('activity.newPatient'),
    description: t('activity.joinedClinic', { name: p.name }),
    time: p.createdAt || new Date()
  }));

  return (
    <>
      <DashboardKPIs data={stats} />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <ActivityFeed activities={activities} />
            <OperationalPanel queue={queue} />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          {/* Mock components removed to strictly show real data */}
        </div>
      </div>
    </>
  );
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-100">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              {t('title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              {t('subtitle')}
            </p>
          </div>
        </div>
        <QuickActions />
      </div>

      <Suspense fallback={
        <div className="space-y-6">
          <Skeleton className="w-full h-32 rounded-xl" />
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="w-full h-64 rounded-xl" />
                <Skeleton className="w-full h-64 rounded-xl" />
              </div>
            </div>
            <div className="lg:col-span-4 space-y-6">
              <Skeleton className="w-full h-64 rounded-xl" />
            </div>
          </div>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
