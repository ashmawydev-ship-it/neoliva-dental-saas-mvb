export const dynamic = "force-dynamic";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Bell, CreditCard } from "lucide-react";
import { fetchSettingsAction } from "@/app/actions/settings";
import { ClinicSettingsForm } from "@/components/settings/ClinicSettingsForm";
import { BillingSettingsForm } from "@/components/settings/BillingSettingsForm";
import { NotificationSettingsForm } from "@/components/settings/NotificationSettingsForm";

import { hasPermission } from "@/lib/rbac";
import { PermissionCode } from "@/types/permissions";
import { redirect } from "next/navigation";

import { getTranslations } from "next-intl/server";

export default async function SettingsPage() {
  if (!(await hasPermission(PermissionCode.SETTINGS_CLINIC_EDIT))) {
    redirect("/dashboard");
  }
  const settings = await fetchSettingsAction();
  const t = await getTranslations('settings');

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-gray-100/80 p-1 rounded-xl h-auto grid w-full grid-cols-3 gap-1">
          <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm py-2.5">
            <Building2 className="w-4 h-4 mr-2" /> {t('tabs.clinic')}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm py-2.5">
            <Bell className="w-4 h-4 mr-2" /> {t('tabs.notifications')}
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm py-2.5">
            <CreditCard className="w-4 h-4 mr-2" /> {t('tabs.billing')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <ClinicSettingsForm initialData={settings as Parameters<typeof ClinicSettingsForm>[0]["initialData"]} />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationSettingsForm initialData={settings as Parameters<typeof NotificationSettingsForm>[0]["initialData"]} />
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <BillingSettingsForm initialData={settings as Parameters<typeof BillingSettingsForm>[0]["initialData"]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
