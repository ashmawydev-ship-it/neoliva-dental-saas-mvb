"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Stethoscope, DollarSign, Clock, LayoutGrid, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createServiceAction } from "@/app/actions/services";
import { toast } from "sonner";
import { ServiceCategory } from "@/generated/client";

export function NewServiceDialog() {
  const t = useTranslations('services');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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

      const result = await createServiceAction(data);

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(t('toast.successCreate'));
        setOpen(false);
      }
    } catch (error) {
      toast.error(t('toast.errorCreate'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 rounded-xl h-11 px-6 text-sm font-bold border-0 text-white">
          <PlusCircle className="mr-2 h-4 w-4" /> {t('newService')}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md md:max-w-lg p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-3xl">
        <DialogHeader className="bg-gray-50/50 px-8 py-6 flex flex-row items-center justify-between border-b shrink-0 m-0 space-y-0">
          <DialogTitle className="text-xl font-black text-gray-900 flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-md shadow-indigo-200">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            {t('newService')}
          </DialogTitle>
        </DialogHeader>

        <form 
          onSubmit={handleSubmit} 
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto w-full p-8 space-y-6">
            
            {/* Service Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-gray-400">{t('form.name')}</Label>
              <Input 
                id="name"
                name="name"
                placeholder={t('form.namePlaceholder')} 
                className="bg-gray-50 border-gray-100 focus-visible:ring-indigo-500 rounded-2xl h-12 font-medium" 
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('form.category')}</Label>
              <div className="relative">
                <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10 pointer-events-none" />
                <Select name="category" required>
                  <SelectTrigger className="pl-12 bg-gray-50 border-gray-100 focus:ring-indigo-500 rounded-2xl h-12 w-full font-medium">
                    <SelectValue placeholder={t('form.selectCategoryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                    {Object.values(ServiceCategory).map((cat) => (
                      <SelectItem key={cat} value={cat} className="rounded-xl focus:bg-indigo-50 focus:text-indigo-600">
                        {t.has(`categories.${cat}`) ? t(`categories.${cat}`) : (cat.charAt(0) + cat.slice(1).toLowerCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price & Duration */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-xs font-black uppercase tracking-widest text-gray-400">{t('form.price')}</Label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="price"
                    name="price"
                    type="number"
                    placeholder="0.00" 
                    min="0"
                    step="0.01"
                    className="pl-12 bg-gray-50 border-gray-100 focus-visible:ring-indigo-500 rounded-2xl h-12 font-medium" 
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-xs font-black uppercase tracking-widest text-gray-400">{t('form.duration')}</Label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="duration"
                    name="duration"
                    type="number"
                    placeholder="30" 
                    min="5"
                    step="5"
                    className="pl-12 bg-gray-50 border-gray-100 focus-visible:ring-indigo-500 rounded-2xl h-12 font-medium" 
                    required
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-gray-400">{t('form.description')}</Label>
              <Textarea 
                id="description"
                name="description"
                placeholder={t('form.descriptionPlaceholder')} 
                className="bg-gray-50 border-gray-100 focus-visible:ring-indigo-500 rounded-2xl min-h-[100px] resize-none p-4 font-medium" 
              />
            </div>
            
            {/* Popular Switch */}
            <div className="flex items-center justify-between p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-gray-900">{t('form.markPopular')}</Label>
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{t('form.highlightDescription')}</p>
              </div>
              <Switch id="popular" name="popular" className="data-[state=checked]:bg-indigo-600 scale-110" />
            </div>

          </div>
          
          <DialogFooter className="bg-gray-50/50 px-8 py-6 border-t flex gap-4 shrink-0 w-full justify-end items-center">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setOpen(false)}
              disabled={loading}
              className="px-6 rounded-2xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 h-12 font-bold"
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
                  {t('form.processing')}
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
