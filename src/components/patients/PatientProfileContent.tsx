"use client";

import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone, Mail, Calendar as CalendarIcon, MapPin, Activity as ActivityIcon,
  FileText, Heart, Stethoscope, ArrowLeft, Image as ImageIcon, Pill, LayoutDashboard, ClipboardList, Smile
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToothChart } from "@/components/patients/ToothChart";
import { Periodontogram } from "@/components/patients/Periodontogram";
import { TreatmentPlans } from "@/components/patients/TreatmentPlans";
import { Prescriptions } from "@/components/patients/Prescriptions";
import { PatientDocuments } from "@/components/patients/PatientDocuments";
import { OralExam } from "@/components/patients/OralExam";
import { MedicalHistory } from "@/components/patients/MedicalHistory";
import { VisitHistory } from "@/components/patients/VisitHistory";
import { BillingList } from "@/components/patients/billing/BillingList";

export function PatientProfileContent({ patient: initialPatient }: { patient: any }) {
  const t = useTranslations('patientProfile');
  const router = useRouter();
  const [patient, setPatient] = useState(initialPatient);

  // Sync local patient state when server re-fetches after router.refresh()
  useEffect(() => {
    setPatient(initialPatient);
  }, [initialPatient]);

  const refreshData = () => {
    // In a server component world, we use router.refresh() to update data
    router.refresh();
  };

  const visits = patient.visitHistory || [];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Link href="/patients">
          <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-muted-foreground hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${patient.color} flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20`}>
                {patient.avatar}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{patient.name}</h1>
                <p className="text-sm text-muted-foreground">{t('patientId', { id: patient.id, date: patient.registeredSince })}</p>
              </div>
            </div>
            <Badge className={`sm:ml-auto rounded-full px-3 py-1 text-xs font-semibold w-fit ${
              patient.status === "Active" 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : "bg-gray-50 text-muted-foreground border-gray-200"
            }`}>
              ● {t('statusBadge', { status: t(`status.${patient.status.toLowerCase()}`) })}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar Info */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" /> {t('info.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { icon: Phone, label: t('info.phone'), value: patient.phone },
                { icon: Mail, label: t('info.email'), value: patient.email },
                { icon: CalendarIcon, label: t('info.dob'), value: patient.dob },
                { icon: MapPin, label: t('info.address'), value: patient.address },
              ].map((item: any) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">{item.label}</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{item.value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {(patient.allergies ?? []).length > 0 && (
          <Card className="border-0 shadow-sm border-l-4 border-l-red-400 dark:bg-slate-900">
            <CardContent className="pt-5 pb-4">
              <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <ActivityIcon className="w-3.5 h-3.5" /> {t('allergies.title')}
              </h4>
              <div className="flex gap-1.5 flex-wrap">
                {patient.allergies.map((allergy: any) => (
                  <Badge 
                    key={allergy.id || allergy.allergen}
                    variant={allergy.severity === "High" ? "destructive" : "default"}
                    className={`rounded-full text-xs ${
                      allergy.severity === "Medium" ? "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100" : ""
                    }`}
                  >
                    {allergy.allergen || allergy.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          )}

          <Card className="border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="pt-5 pb-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{t('quickStats.title')}</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t('quickStats.totalVisits'), value: String(patient.visits || patient.visitHistory?.length || 0) },
                  { label: t('quickStats.outstanding'), value: `$${Number(patient.outstanding ?? 0).toFixed(2)}` },
                  { label: t('quickStats.lastXray'), value: patient.lastXRay || 'None' },
                  { label: t('quickStats.insurance'), value: patient.insurance || 'None' },
                ].map((stat: any) => (
                  <div key={stat.label} className="p-3 rounded-xl bg-gray-50 text-center dark:bg-slate-800">
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="history" className="w-full max-w-full min-w-0">
            <TabsList className="bg-gray-100/80 dark:bg-slate-800/80 p-1 rounded-xl h-auto flex overflow-x-auto w-full justify-start gap-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {[
                { value: "history", label: t('tabs.history'), icon: Stethoscope },
                { value: "medicalHistory", label: t('tabs.medicalHistory'), icon: ClipboardList },
                { value: "oralExamination", label: t('tabs.oralExam'), icon: Smile },
                { value: "odontogram", label: t('tabs.toothChart'), icon: LayoutDashboard },
                { value: "periodontogram", label: t('tabs.periodonto'), icon: ActivityIcon },
                { value: "plan", label: t('tabs.plans'), icon: FileText },
                { value: "prescriptions", label: t('tabs.rx'), icon: Pill },
                { value: "documents", label: t('tabs.documents'), icon: ImageIcon },
                { value: "billing", label: t('tabs.billing'), icon: FileText },
              ].map((tab: any) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm text-xs font-medium py-2 flex-shrink-0 whitespace-nowrap min-w-max px-4"
                >
                  <tab.icon className="w-3.5 h-3.5 mr-1.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="history" className="mt-6">
              <VisitHistory visits={visits} patientId={patient.id} />
            </TabsContent>

            <TabsContent value="medicalHistory" className="mt-6 animate-fade-in-up">
              <MedicalHistory patient={patient} onRefresh={refreshData} />
            </TabsContent>

            <TabsContent value="oralExamination" className="mt-6 animate-fade-in-up">
              <OralExam patient={patient} onRefresh={refreshData} />
            </TabsContent>

            <TabsContent value="odontogram" className="mt-6">
              <ToothChart patient={patient} onRefresh={refreshData} />
            </TabsContent>

            <TabsContent value="periodontogram" className="mt-6" keepMounted>
              <Periodontogram patient={patient} onRefresh={refreshData} />
            </TabsContent>

            <TabsContent value="plan" className="mt-6">
              <TreatmentPlans patientId={patient.id} onRefresh={refreshData} />
            </TabsContent>

            <TabsContent value="prescriptions" className="mt-6">
              <Prescriptions patientId={patient.id} initialData={patient.prescriptions} patientName={patient.name} onRefresh={refreshData} />
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <PatientDocuments patientId={patient.id} tenantId={patient.tenantId} initialData={patient.patient_documents} onRefresh={refreshData} />
            </TabsContent>

            <TabsContent value="billing" className="mt-6">
              <BillingList 
                patientId={patient.id} 
                patientName={patient.name} 
                invoiceHistory={patient.invoiceHistory} 
                outstanding={patient.outstanding}
                onRefresh={refreshData}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
