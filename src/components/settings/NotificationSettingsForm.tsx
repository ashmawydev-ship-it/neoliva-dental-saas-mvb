"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { updateNotificationsAction } from "@/app/actions/settings";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const notificationsSchema = z.object({
  emailReminders: z.boolean(),
  smsReminders: z.boolean(),
  invoiceReceipts: z.boolean(),
  lowInventoryAlerts: z.boolean(),
});

interface NotificationSettingsData {
  notificationsConfig?: {
    emailReminders?: boolean;
    smsReminders?: boolean;
    invoiceReceipts?: boolean;
    lowInventoryAlerts?: boolean;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export function NotificationSettingsForm({ initialData }: { initialData: NotificationSettingsData | null }) {
  const t = useTranslations('settings');
  const [isPending, setIsPending] = useState(false);

  const config = initialData?.notificationsConfig || {};

  const { handleSubmit, control, formState: { isDirty } } = useForm({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      emailReminders: Boolean(config.emailReminders ?? true),
      smsReminders: Boolean(config.smsReminders ?? true),
      invoiceReceipts: Boolean(config.invoiceReceipts ?? true),
      lowInventoryAlerts: Boolean(config.lowInventoryAlerts ?? false),
    },
  });

  const onSubmit = async (data: z.infer<typeof notificationsSchema>) => {
    setIsPending(true);
    try {
      await updateNotificationsAction(data);
      toast.success("Notification settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsPending(false);
    }
  };

  const notifications = [
    { name: "emailReminders", title: t('notifications.emailReminders'), desc: t('notifications.emailRemindersDesc') },
    { name: "smsReminders", title: t('notifications.smsReminders'), desc: t('notifications.smsRemindersDesc') },
    { name: "invoiceReceipts", title: t('notifications.invoiceReceipts'), desc: t('notifications.invoiceReceiptsDesc') },
    { name: "lowInventoryAlerts", title: t('notifications.lowInventoryAlerts'), desc: t('notifications.lowInventoryAlertsDesc') },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="border-0 shadow-sm dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base font-semibold dark:text-white">{t('notifications.title')}</CardTitle>
          <CardDescription className="dark:text-gray-400">{t('notifications.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {notifications.map((item) => (
            <div key={item.name} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="pr-4">
                <Label className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
              <Controller
                name={item.name as "emailReminders" | "smsReminders" | "invoiceReceipts" | "lowInventoryAlerts"}
                control={control}
                render={({ field }) => (
                  <Switch 
                    checked={Boolean(field.value)} 
                    onCheckedChange={field.onChange} 
                  />
                )}
              />
            </div>
          ))}
        </CardContent>
        <CardFooter className="border-t dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 rounded-b-xl flex justify-between items-center">
          {isDirty ? <p className="text-xs text-amber-600 font-medium">Unsaved changes</p> : <div />}
          <Button 
            disabled={isPending || !isDirty} 
            type="submit" 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 mt-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {t('notifications.saveChanges')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
