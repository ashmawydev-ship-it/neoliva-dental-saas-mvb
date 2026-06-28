"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { updateClinicAction } from "@/app/actions/settings";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface ClinicSettingsData {
  clinicName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  [key: string]: unknown;
}

export function ClinicSettingsForm({ initialData }: { initialData: ClinicSettingsData | null }) {
  const t = useTranslations('settings');
  const [isPending, setIsPending] = useState(false);

  const clinicSchema = z.object({
    clinicName: z.string().min(1, t('clinic.errors.clinicNameRequired')),
    email: z.string().email(t('clinic.errors.invalidEmail')).optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
  });

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(clinicSchema),
    defaultValues: {
      clinicName: initialData?.clinicName || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      address: initialData?.address || "",
    },
  });

  const onSubmit = async (data: z.infer<typeof clinicSchema>) => {
    setIsPending(true);
    try {
      await updateClinicAction(data);
      toast.success("Clinic settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="border-0 shadow-sm dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base font-semibold dark:text-white">{t('clinic.title')}</CardTitle>
          <CardDescription className="dark:text-gray-400">{t('clinic.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('clinic.clinicName')}</Label>
              <Input {...register("clinicName")} className="h-10 rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              {errors.clinicName && <p className="text-xs text-red-500">{errors.clinicName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('clinic.email')}</Label>
              <Input {...register("email")} className="h-10 rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('clinic.address')}</Label>
            <Input {...register("address")} className="h-10 rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('clinic.phone')}</Label>
              <Input {...register("phone")} className="h-10 rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 rounded-b-xl flex justify-between items-center">
          {isDirty ? <p className="text-xs text-amber-600 font-medium">Unsaved changes</p> : <div />}
          <Button 
            disabled={isPending || !isDirty} 
            type="submit" 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 mt-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {t('clinic.saveChanges')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
