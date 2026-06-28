"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Stethoscope, DollarSign, Clock, LayoutGrid, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateServiceAction } from "@/app/actions/services";
import { toast } from "sonner";
import { ServiceCategory } from "@/generated/client";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  category: ServiceCategory;
  popular: boolean | null;
}

interface EditServiceDialogProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditServiceDialog({ service, open, onOpenChange }: EditServiceDialogProps) {
  const t = useTranslations('services');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!service) return;
    
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      const data = {
        name: formData.get('name') as string,
        category: formData.get('category') as ServiceCategory,
        price: parseFloat(formData.get('price') as string),
        duration: parseInt(formData.get('duration') as string, 10),
        description: formData.get('description') as string,
        popular: formData.get('popular') === 'on'
      };

      if (!data.name || !data.category || isNaN(data.price) || isNaN(data.duration)) {
        toast.error(t('toast.fillRequired'));
        setLoading(false);
        return;
      }

      const result = await updateServiceAction(service.id, data);

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(t('toast.updateSuccess'));
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(t('toast.updateError'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-3xl">
        <DialogHeader className="bg-gray-50/50 dark:bg-slate-800/50 px-8 py-6 flex flex-row items-center justify-between border-b dark:border-slate-800 shrink-0 m-0 space-y-0">
          <DialogTitle className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            {t('actions.edit')}
          </DialogTitle>
        </DialogHeader>

        <form 
          onSubmit={handleSubmit} 
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto w-full p-8 space-y-6">
            
            {/* Service Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('form.name')}</Label>
              <Input 
                id="edit-name"
                name="name"
                defaultValue={service.name}
                placeholder={t('form.namePlaceholder')} 
                className="bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 focus-visible:ring-indigo-500 rounded-2xl h-12 font-medium dark:text-white" 
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('form.category')}</Label>
              <div className="relative">
                <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10 pointer-events-none" />
                <Select name="category" defaultValue={service.category} required>
                  <SelectTrigger className="pl-12 bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 focus:ring-indigo-500 rounded-2xl h-12 w-full font-medium dark:text-white">
                    <SelectValue placeholder={t('form.selectCategoryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100 dark:border-slate-700 shadow-xl bg-white dark:bg-slate-900">
                    {Object.values(ServiceCategory).map((cat) => (
                      <SelectItem key={cat} value={cat} className="rounded-xl focus:bg-indigo-50 dark:focus:bg-slate-800">
                        <span className="dark:text-gray-200">{t.has(`categories.${cat}`) ? t(`categories.${cat}`) : (cat.charAt(0) + cat.slice(1).toLowerCase())}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price & Duration */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="edit-price" className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('form.price')}</Label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="edit-price"
                    name="price"
                    type="number"
                    defaultValue={service.price}
                    placeholder="0.00" 
                    min="0"
                    step="0.01"
                    className="pl-12 bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 focus-visible:ring-indigo-500 rounded-2xl h-12 font-medium dark:text-white" 
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-duration" className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('form.duration')}</Label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="edit-duration"
                    name="duration"
                    type="number"
                    defaultValue={service.duration}
                    placeholder="30" 
                    min="5"
                    step="5"
                    className="pl-12 bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 focus-visible:ring-indigo-500 rounded-2xl h-12 font-medium dark:text-white" 
                    required
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('form.description')}</Label>
              <Textarea 
                id="edit-description"
                name="description"
                defaultValue={service.description || ""}
                placeholder={t('form.descriptionPlaceholder')} 
                className="bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 focus-visible:ring-indigo-500 rounded-2xl min-h-[100px] resize-none p-4 font-medium dark:text-white" 
              />
            </div>
            
            {/* Popular Switch */}
            <div className="flex items-center justify-between p-5 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-gray-900 dark:text-white">{t('form.markPopular')}</Label>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">{t('form.highlightDescription')}</p>
              </div>
              <Switch 
                id="edit-popular" 
                name="popular" 
                defaultChecked={!!service.popular}
                className="data-[state=checked]:bg-indigo-600 scale-110" 
              />
            </div>

          </div>
          
          <DialogFooter className="bg-gray-50/50 dark:bg-slate-800/50 px-8 py-6 border-t dark:border-slate-800 flex gap-4 shrink-0 w-full justify-end items-center">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="px-6 rounded-2xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 h-12 font-bold"
            >
              {t('form.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 h-12 font-black transition-all hover:scale-[1.02] active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('form.updating')}
                </>
              ) : (
                t('form.save')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
