export const dynamic = 'force-dynamic';

import { Card, CardContent } from "@/components/ui/card";
import { Truck, AlertCircle, CheckCircle, DollarSign, Clock, Beaker } from "lucide-react";
import { NewLabOrderDialog } from "@/components/lab-orders/NewLabOrderDialog";
import { LabOrdersTable } from "@/components/lab-orders/LabOrdersTable";
import { LabOrderService } from "@/services/lab-order.service";
import { PatientService } from "@/services/patient.service";
import { resolveTenantContextOrRedirect as resolveTenantContext } from "@/lib/auth/resolve-tenant-context";
import { getTranslations } from "next-intl/server";

const labOrderService = new LabOrderService();
const patientService = new PatientService();

export default async function LabOrdersPage() {
  const t = await getTranslations('labOrders');
  const { tenantId } = await resolveTenantContext();
  
  // Fetch data in parallel
  const [labOrders, stats, patients] = await Promise.all([
    labOrderService.getLabOrdersList(tenantId),
    labOrderService.getLabOrdersStats(tenantId),
    patientService.getPatientsForSelection(tenantId)
  ]);

  const statCards = [
    { 
      label: t('stats.activeCases'), 
      value: stats.activeCases.toString(), 
      icon: Clock, 
      color: "text-blue-600 dark:text-blue-400", 
      bg: "bg-blue-50 dark:bg-blue-900/20",
      description: t('stats.activeCasesDesc')
    },
    { 
      label: t('stats.dueThisWeek'), 
      value: stats.dueThisWeek.toString(), 
      icon: AlertCircle, 
      color: "text-amber-600 dark:text-amber-400", 
      bg: "bg-amber-50 dark:bg-amber-900/20",
      description: t('stats.dueThisWeekDesc')
    },
    { 
      label: t('stats.received'), 
      value: stats.received.toString(), 
      icon: CheckCircle, 
      color: "text-emerald-600 dark:text-emerald-400", 
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      description: t('stats.receivedDesc')
    },
    { 
      label: t('stats.monthlyCost'), 
      value: `$${stats.monthlyCost.toLocaleString()}`, 
      icon: DollarSign, 
      color: "text-purple-600 dark:text-purple-400", 
      bg: "bg-purple-50 dark:bg-purple-900/20",
      description: t('stats.monthlyCostDesc')
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-in pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <Beaker className="w-10 h-10 text-purple-600 dark:text-purple-400" />
            {t('title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t('subtitle')}</p>
        </div>
        <NewLabOrderDialog patients={patients} />
      </div>

      {/* Stats Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-500`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-[10px] font-bold text-gray-300 dark:text-gray-500 uppercase tracking-widest">{t('liveUpdate')}</div>
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{stat.value}</h2>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{stat.label}</p>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-4 font-medium italic">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Table Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Truck className="w-5 h-5 text-purple-500 dark:text-purple-400" />
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t('orderManagement')}</h2>
        </div>
        <LabOrdersTable initialOrders={labOrders} />
      </div>
    </div>
  );
}
