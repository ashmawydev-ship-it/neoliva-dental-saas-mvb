"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Trash2, 
  Receipt, 
  DollarSign, 
  Stethoscope,
  Calendar,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { createInvoice } from "@/app/actions/billing";
import { useTranslations } from "next-intl";

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onRefresh?: () => void;
}

export function InvoiceForm({ isOpen, onClose, patientId, onRefresh }: InvoiceFormProps) {
  const t = useTranslations('patientBilling');
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState([{ description: "", quantity: 1, price: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, price: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof typeof items[0], value: string | number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.price) * item.quantity || 0), 0);

  const handleSubmit = async () => {
    if (items.some(i => !i.description || !i.price)) return toast.error("Please fill all item details");
    if (totalAmount <= 0) return toast.error("Invoice total must be greater than zero");

    setIsSubmitting(true);
    const toastId = toast.loading("Creating invoice...");

    try {
      const result = await createInvoice({
        patientId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        items: items.map(i => ({ 
          description: i.description, 
          quantity: Number(i.quantity),
          price: Number(i.price) 
        }))
      });

      if (result.success) {
        toast.success("Invoice created successfully", { id: toastId });
        setItems([{ description: "", quantity: 1, price: "" }]);
        setDueDate("");
        onClose();
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create invoice", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden rounded-[32px] border-0 shadow-2xl">
        <div className="bg-indigo-600 p-8 text-white relative">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
              <Receipt className="w-6 h-6" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">{t('form.title')}</DialogTitle>
              <p className="text-indigo-100 text-sm font-medium mt-1">{t('form.subtitle')}</p>
            </DialogHeader>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <DollarSign className="w-32 h-32" />
          </div>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="dueDate" className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">{t('form.dueDate')}</Label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="pl-11 h-12 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">{t('form.invoiceItems')}</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addItem}
                className="h-8 rounded-lg border-indigo-100 text-indigo-600 font-bold hover:bg-indigo-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 group animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex-[2]">
                    <Input
                      placeholder={t('form.itemDescription')}
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      className="h-11 rounded-xl border-gray-200"
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      placeholder={t('form.qty')}
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                      className="h-11 rounded-xl border-gray-200 text-center"
                    />
                  </div>
                  <div className="w-32 relative">
                    <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      placeholder={t('form.price')}
                      value={item.price}
                      onChange={(e) => updateItem(index, "price", e.target.value)}
                      className="h-11 pl-8 rounded-xl border-gray-200 font-bold"
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeItem(index)}
                    className="h-11 w-11 rounded-xl text-gray-300 hover:text-rose-500 hover:bg-rose-50"
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50 flex items-center justify-between border-t border-gray-100">
          <div className="text-left">
            <p className="text-xs text-gray-400 font-black uppercase tracking-tighter">{t('form.totalAmount')}</p>
            <p className="text-2xl font-black text-indigo-600">${totalAmount.toFixed(2)}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold text-gray-500 px-6 h-12">{t('form.cancel')}</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8 font-black shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              {t('form.create')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
