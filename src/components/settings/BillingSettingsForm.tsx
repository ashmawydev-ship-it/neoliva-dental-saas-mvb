"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2 } from "lucide-react";
import { updateBillingAction } from "@/app/actions/settings";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const billingSchema = z.object({
  currency: z.string().min(1, "Currency is required"),
  taxRate: z.coerce.number().min(0).max(100),
  invoiceNote: z.string().optional(),
});

interface BillingSettingsData {
  currency?: string | null;
  taxRate?: number | string | null;
  invoiceNote?: string | null;
  [key: string]: unknown;
}

export function BillingSettingsForm({ initialData }: { initialData: BillingSettingsData | null }) {
  const t = useTranslations('settings');
  const [isPending, setIsPending] = useState(false);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      currency: initialData?.currency || "USD",
      taxRate: initialData?.taxRate ? Number(initialData.taxRate) : 0,
      invoiceNote: initialData?.invoiceNote || "",
    },
  });

  const onSubmit = async (data: z.infer<typeof billingSchema>) => {
    setIsPending(true);
    try {
      await updateBillingAction(data);
      toast.success("Billing settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">{t('billingSettings.title')}</CardTitle>
          <CardDescription>{t('billingSettings.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">{t('billingSettings.currency')}</Label>
              <Input {...register("currency")} className="h-10 rounded-xl" />
              {errors.currency && <p className="text-xs text-red-500">{errors.currency.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">{t('billingSettings.taxRate')}</Label>
              <Input type="number" step="0.01" {...register("taxRate")} className="h-10 rounded-xl" />
              {errors.taxRate && <p className="text-xs text-red-500">{errors.taxRate.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">{t('billingSettings.invoiceNote')}</Label>
            <Textarea {...register("invoiceNote")} className="rounded-xl resize-none" rows={3} />
          </div>
        </CardContent>
        <CardFooter className="border-t bg-gray-50/50 rounded-b-xl flex justify-between items-center">
          {isDirty ? <p className="text-xs text-amber-600 font-medium">Unsaved changes</p> : <div />}
          <Button 
            disabled={isPending || !isDirty} 
            type="submit" 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 mt-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {t('billingSettings.saveChanges')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
