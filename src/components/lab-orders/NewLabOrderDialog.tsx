"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Beaker, 
  Truck, 
  FileText, 
  User, 
  Stethoscope,
  Calendar as CalendarIcon,
  Tag,
  DollarSign
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLabOrderAction } from "@/app/actions/lab-orders";
import { toast } from "sonner";

interface NewLabOrderDialogProps {
  patients: any[];
}

export function NewLabOrderDialog({ patients }: NewLabOrderDialogProps) {
  const t = useTranslations('labOrders');
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    patientId: "",
    labName: "",
    itemType: "",
    toothNumber: "",
    cost: "",
    dueDate: "",
    notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.labName || !formData.itemType) {
      toast.error(t('toast.fillRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createLabOrderAction({
        ...formData,
        cost: formData.cost ? Number(formData.cost) : 0
      });

      if (res.success) {
        toast.success(t('toast.createSuccess'));
        setOpen(false);
        setFormData({
          patientId: "",
          labName: "",
          itemType: "",
          toothNumber: "",
          cost: "",
          dueDate: "",
          notes: ""
        });
      } else {
        toast.error(res.error || t('toast.createError'));
      }
    } catch (error) {
      toast.error(t('toast.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 h-12 rounded-2xl shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 border-0 cursor-pointer">
          <Plus className="w-5 h-5" /> {t('newOrder')}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md md:max-w-xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-3xl">
        <DialogHeader className="bg-gray-50 dark:bg-slate-800/50 px-8 py-6 flex flex-row items-center justify-between border-b dark:border-slate-800 shrink-0 m-0 space-y-0">
          <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-4">
            <div className="bg-purple-600 p-3 rounded-2xl text-white shadow-lg shadow-purple-500/30">
              <Beaker className="h-6 w-6" />
            </div>
            {t('dialog.createOrder')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            
            {/* Info Box */}
            <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 p-4 rounded-2xl flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                <FileText className="w-4 h-4" />
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                {t('form.infoBox')}
              </p>
            </div>

            {/* Patient Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <User className="w-4 h-4" /> {t('form.patientSelection')}
              </Label>
              <Select 
                value={formData.patientId} 
                onValueChange={(val) => setFormData({ ...formData, patientId: val ?? "" })}
              >
                <SelectTrigger className="h-12 border-gray-200 dark:border-slate-700 focus:ring-purple-500/20 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50 dark:text-white">
                  <SelectValue placeholder={t('form.selectPatientPlaceholder')}>
                    {formData.patientId ? patients.find(p => p.id === formData.patientId)?.name : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100 dark:border-slate-700 shadow-2xl p-1 bg-white dark:bg-slate-900">
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id} className="rounded-xl my-0.5 focus:bg-purple-50 dark:focus:bg-slate-800">
                      <span className="dark:text-gray-200">{p.name}</span> <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-2">#{p.displayId}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lab Name */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Truck className="w-4 h-4" /> {t('form.labName')}
                </Label>
                <Input 
                  placeholder={t('form.labNamePlaceholder')} 
                  value={formData.labName}
                  onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                  className="h-12 border-gray-200 dark:border-slate-700 focus:ring-purple-500/20 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50 dark:text-white" 
                />
              </div>

              {/* Item Type */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Tag className="w-4 h-4" /> {t('form.itemType')}
                </Label>
                <Input 
                  placeholder={t('form.itemTypePlaceholder')} 
                  value={formData.itemType}
                  onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                  className="h-12 border-gray-200 dark:border-slate-700 focus:ring-purple-500/20 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50 dark:text-white" 
                />
              </div>

              {/* Tooth Number */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" /> {t('form.toothNumber')}
                </Label>
                <Input 
                  placeholder={t('form.toothNumberPlaceholder')} 
                  value={formData.toothNumber}
                  onChange={(e) => setFormData({ ...formData, toothNumber: e.target.value })}
                  className="h-12 border-gray-200 dark:border-slate-700 focus:ring-purple-500/20 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50 dark:text-white" 
                />
              </div>

              {/* Cost */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> {t('form.cost')}
                </Label>
                <div className="relative">
                  <Input 
                    type="number"
                    placeholder="0.00" 
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="h-12 pl-10 border-gray-200 dark:border-slate-700 focus:ring-purple-500/20 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50 font-bold dark:text-white" 
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-bold">$</div>
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" /> {t('form.expectedDate')}
              </Label>
              <Input 
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="h-12 border-gray-200 dark:border-slate-700 focus:ring-purple-500/20 rounded-2xl bg-amber-50/30 dark:bg-amber-900/10 font-bold text-amber-900 dark:text-amber-100" 
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('form.notes')}</Label>
              <Textarea 
                placeholder={t('form.notesPlaceholder')} 
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-[100px] border-gray-200 dark:border-slate-700 focus:ring-purple-500/20 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50 dark:text-white resize-none p-4" 
              />
            </div>

          </div>
          
          <DialogFooter className="bg-gray-50 dark:bg-slate-800/50 px-8 py-6 border-t dark:border-slate-800 flex gap-4 sm:justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="h-12 px-6 rounded-2xl border-gray-200 dark:border-slate-700 font-semibold hover:bg-white dark:hover:bg-slate-800 dark:text-white cursor-pointer"
              disabled={isSubmitting}
            >
              {t('form.discard')}
            </Button>
            <Button 
              type="submit" 
              className="h-12 px-10 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-500/25 cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('form.submitting') : t('form.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
