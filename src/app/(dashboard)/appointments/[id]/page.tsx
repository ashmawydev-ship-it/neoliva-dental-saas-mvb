import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, Clock, User, Stethoscope, 
  ClipboardList, Activity, MapPin, ArrowLeft,
  FileText
} from "lucide-react";
import Link from "next/link";
import { appointmentService } from "@/config/di";
import { resolveTenantContextOrRedirect } from "@/lib/auth/resolve-tenant-context";

export const dynamic = 'force-dynamic';

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations('appointments');
  const { tenantId } = await resolveTenantContextOrRedirect();
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  if (!tenantId) {
    return notFound();
  }

  const appointment = await appointmentService.getAppointmentDetails(tenantId, id);

  if (!appointment || appointment.id === "unknown") {
    return notFound();
  }

  const aptDate = new Date(appointment.date);
  const aptTime = new Date(appointment.time);

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/appointments">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Appointment Details</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            {aptDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at {aptTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`px-3 py-1 font-semibold uppercase tracking-wider ${
            appointment.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            appointment.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            appointment.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
            'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {appointment.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Participant Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Patient</p>
                  <p className="text-base font-semibold">{appointment.patient?.name || appointment.patient}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Doctor</p>
                  <p className="text-base font-semibold flex items-center gap-1.5">
                    <Stethoscope className="h-4 w-4 text-emerald-600" />
                    Dr. {appointment.doctor?.name || appointment.doctor}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-purple-600" />
                Clinical Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Treatment</p>
                  <p className="text-base font-semibold">{appointment.treatment || "General Checkup"}</p>
                </div>
                {appointment.service && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Service</p>
                    <p className="text-base font-semibold flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-rose-500" />
                      {appointment.service?.name}
                    </p>
                  </div>
                )}
              </div>

              {appointment.notes && (
                <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> Notes
                  </p>
                  <p className="text-sm bg-gray-50 dark:bg-slate-800 p-4 rounded-xl leading-relaxed">
                    {appointment.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Details */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Schedule & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-blue-100 text-blue-700 p-1.5 rounded-lg dark:bg-blue-900/30 dark:text-blue-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">{aptDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-amber-100 text-amber-700 p-1.5 rounded-lg dark:bg-amber-900/30 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Time & Duration</p>
                  <p className="text-sm text-muted-foreground">{aptTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ({appointment.duration} min)</p>
                </div>
              </div>

              {(appointment.room || appointment.chair) && (
                <div className="flex items-start gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <div className="mt-0.5 bg-rose-100 text-rose-700 p-1.5 rounded-lg dark:bg-rose-900/30 dark:text-rose-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.room?.name || "Unassigned Room"} 
                      {appointment.chair ? ` - ${appointment.chair.name}` : ""}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card className="border-0 shadow-sm overflow-hidden sticky top-6">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-500" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {(appointment.status === "CANCELLED" || appointment.status === "NO_SHOW") ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
                    <span className="text-red-600 dark:text-red-400 font-bold text-xl">!</span>
                  </div>
                  <h3 className="text-lg font-bold text-red-600 dark:text-red-400">
                    {appointment.status === "NO_SHOW" ? "No Show" : "Cancelled"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">This appointment did not proceed.</p>
                </div>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {[
                    { id: "SCHEDULED", label: "Scheduled" },
                    { id: "ARRIVED", label: "Arrived" },
                    { id: "IN_PROGRESS", label: "In Progress" },
                    { id: "COMPLETED", label: "Completed" }
                  ].map((status, index) => {
                    const statusOrder = ["SCHEDULED", "ARRIVED", "IN_PROGRESS", "COMPLETED"];
                    const currentStatusIndex = statusOrder.indexOf(appointment.status);
                    const isCompleted = currentStatusIndex >= index;
                    const isCurrent = currentStatusIndex === index;
                    
                    return (
                      <div key={status.id} className="relative flex items-center group">
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 bg-card z-10 shrink-0 
                          ${isCompleted ? 'border-primary bg-primary' : 'border-border text-muted-foreground'}`}
                        >
                          {isCompleted && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        
                        <div className={`ml-4 w-full p-4 rounded-xl border ${
                          isCurrent ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-card border-border/50 shadow-none opacity-60'
                        }`}>
                          <h4 className={`text-sm font-bold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>{status.label}</h4>
                          {isCurrent && (
                            <p className="text-xs text-muted-foreground mt-0.5">Currently in this stage</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
