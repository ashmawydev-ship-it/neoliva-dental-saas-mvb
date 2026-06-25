"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Receipt, DollarSign, Calendar, Tag, CreditCard, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createExpense } from "@/app/actions/expenses";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function NewExpenseDialog() {
  const t = useTranslations('expenses');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    date: "",
    category: "",
    status: "paid",
    description: "",
    notes: ""
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await createExpense({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      toast.success(t('toast.successCreate'));
      setOpen(false);
      
      // Reset form
      setFormData({
        title: "",
        amount: "",
        date: "",
        category: "",
        status: "paid",
        description: "",
        notes: ""
      });
      
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(t('toast.errorCreate'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md px-5 h-10 font-medium border-0">
          <Plus className="mr-2 h-4 w-4" /> {t('newExpense')}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md md:max-w-lg p-0 overflow-hidden bg-gray-50 border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="bg-white px-6 py-4 flex flex-row items-center justify-between border-b shrink-0 m-0 space-y-0">
          <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <span className="bg-red-100 p-2 rounded-xl">
              <Receipt className="h-5 w-5 text-red-600" />
            </span>
            {t('newExpense')}
          </DialogTitle>
        </DialogHeader>

        <form 
          onSubmit={handleSubmit} 
          className="flex-1 flex flex-col overflow-hidden max-h-[80vh]"
        >
          <div className="flex-1 overflow-y-auto w-full p-6 space-y-5">
            
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold text-gray-700">{t('form.title')}</Label>
              <Input 
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder={t('form.titlePlaceholder')} 
                className="bg-white border-gray-200 focus-visible:ring-red-500 rounded-xl shadow-sm h-11" 
                required
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-gray-700">{t('form.description')} ({t('form.optional')})</Label>
              <Input 
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder={t('form.descriptionPlaceholder')} 
                className="bg-white border-gray-200 focus-visible:ring-red-500 rounded-xl shadow-sm h-11" 
                disabled={loading}
              />
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-semibold text-gray-700">{t('form.amount')}</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    placeholder="0.00" 
                    min="0"
                    step="0.01"
                    className="pl-10 bg-white border-gray-200 focus-visible:ring-red-500 rounded-xl shadow-sm h-11" 
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-semibold text-gray-700">{t('form.date')}</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <Input 
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className="pl-10 bg-white border-gray-200 focus-visible:ring-red-500 rounded-xl shadow-sm h-11" 
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Category & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">{t('form.category')}</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <Select 
                    required
                    value={formData.category}
                    onValueChange={(val) => handleChange('category', val)}
                    disabled={loading}
                  >
                    <SelectTrigger className="pl-10 bg-white border-gray-200 focus:ring-red-500 rounded-xl shadow-sm h-11 w-full">
                      <SelectValue placeholder={t('form.selectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplies">{t('categories.supplies')}</SelectItem>
                      <SelectItem value="utilities">{t('categories.utilities')}</SelectItem>
                      <SelectItem value="equipment">{t('categories.equipment')}</SelectItem>
                      <SelectItem value="rent">{t('categories.rent')}</SelectItem>
                      <SelectItem value="marketing">{t('categories.marketing')}</SelectItem>
                      <SelectItem value="other">{t('categories.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">{t('form.status')}</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <Select 
                    required
                    value={formData.status}
                    onValueChange={(val) => handleChange('status', val)}
                    disabled={loading}
                  >
                    <SelectTrigger className="pl-10 bg-white border-gray-200 focus:ring-red-500 rounded-xl shadow-sm h-11 w-full">
                      <SelectValue placeholder={t('form.selectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">{t('status.PAID')}</SelectItem>
                      <SelectItem value="pending">{t('status.PENDING')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-semibold text-gray-700">{t('form.notes')}</Label>
              <Textarea 
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder={t('form.notesPlaceholder')} 
                className="bg-white border-gray-200 focus-visible:ring-red-500 rounded-xl shadow-sm min-h-[80px] resize-none" 
                disabled={loading}
              />
            </div>

          </div>
          
          <DialogFooter className="bg-white px-6 py-4 border-t flex gap-3 shrink-0 w-full justify-end items-center">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
              className="px-6 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 h-11 shadow-sm font-medium"
            >
              {t('form.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="px-8 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/25 h-11 font-semibold"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('form.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
