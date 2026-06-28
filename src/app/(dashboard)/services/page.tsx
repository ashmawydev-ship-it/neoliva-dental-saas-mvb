export const dynamic = 'force-dynamic';

import { ServiceService } from "@/services/service.service";
import { ServicesView } from "@/components/services/ServicesView";
import { NewServiceDialog } from "@/components/services/NewServiceDialog";
import { 
  Sparkles, 
  LayoutGrid, 
  Zap, 
  BarChart3 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { resolveTenantContextOrRedirect as resolveTenantContext } from "@/lib/auth/resolve-tenant-context";
import { getTranslations } from "next-intl/server";

export default async function ServicesPage() {
  const { tenantId } = await resolveTenantContext();
  const serviceService = new ServiceService();
  const services = await serviceService.getServices(tenantId);
  const t = await getTranslations('services');

  // Stats for the top row
  const stats = [
    { label: t('stats.activeServices'), value: services.length, icon: LayoutGrid, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400" },
    { label: t('stats.mostPopular'), value: services.filter(s => s.popular).length, icon: Sparkles, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400" },
    { label: t('stats.revenueDriver'), value: services.length > 0 ? t('stats.premium') : t('stats.none'), icon: Zap, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400" },
    { label: t('stats.avgDuration'), value: services.length > 0 
      ? `${Math.round(services.reduce((acc, s) => acc + s.duration, 0) / services.length)} ${t('stats.m')}` 
      : `0 ${t('stats.m')}`, icon: BarChart3, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400" },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>
        <NewServiceDialog />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm card-hover bg-white dark:bg-slate-900">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ServicesView initialServices={services} />
    </div>
  );
}
