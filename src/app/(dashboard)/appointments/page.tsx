export const dynamic = 'force-dynamic';
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarDays, Clock, 
  CheckCircle2, XCircle
} from "lucide-react";
import { Suspense } from "react";
import { getAppointmentsData, getAppointmentFormData } from "@/app/actions/appointments";
import { NewAppointmentDialog } from "@/components/appointments/NewAppointmentDialog";
import { AppointmentsView } from "@/components/appointments/AppointmentsView";
import { getTranslations } from "next-intl/server";
import AppointmentsLoading from "./loading";

async function AppointmentFormWrapper() {
  const formData = await getAppointmentFormData();
  return (
    <NewAppointmentDialog 
      doctors={formData.doctors} 
      services={formData.services} 
      rooms={formData.rooms}
    />
  );
}

async function AppointmentsDataWrapper({ t }: { t: any }) {
  const [data, formData] = await Promise.all([
    getAppointmentsData(),
    getAppointmentFormData()
  ]);
  const { list, stats: statsData } = data;

  const stats = [
    { label: t('stats.totalToday'), value: statsData.totalToday.toString(), icon: CalendarDays, accent: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400" },
    { label: t('stats.completed'), value: statsData.completed.toString(), icon: CheckCircle2, accent: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400" },
    { label: t('stats.inProgress'), value: statsData.inProgress.toString(), icon: Clock, accent: "text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400" },
    { label: t('stats.cancelled'), value: statsData.cancelled.toString(), icon: XCircle, accent: "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm card-hover">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.accent}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <AppointmentsView initialAppointments={list} rooms={formData.rooms} />
    </>
  );
}

export default async function AppointmentsPage() {
  const t = await getTranslations('appointments');

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <Suspense fallback={<div className="h-10 w-36 bg-gray-100 animate-pulse rounded-md" />}>
          <AppointmentFormWrapper />
        </Suspense>
      </div>

      <Suspense fallback={<AppointmentsLoading />}>
        <AppointmentsDataWrapper t={t} />
      </Suspense>
    </div>
  );
}
