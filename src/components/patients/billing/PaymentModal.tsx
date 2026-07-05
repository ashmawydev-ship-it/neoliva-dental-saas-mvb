"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  CreditCard, 
  DollarSign, 
  CheckCircle2,
  Calendar,
  Wallet,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { recordPayment } from "@/app/actions/billing";
import { PaymentMethod } from "@/generated/client";
import { Decimal } from "decimal.js-light";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  patientId: string;
  onRefresh?: () => void;
}

const PAYMENT_METHODS = [
  { id: "CASH", icon: Wallet, label: "Cash" },
  { id: "CARD", icon: CreditCard, label: "Credit Card" },
  { id: "TRANSFER", icon: ArrowRight, label: "Bank Transfer" },
];

export function PaymentModal({ isOpen, onClose, invoice, patientId, onRefresh }: PaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remainingBalance = invoice ? new Decimal(invoice.totalAmount || 0).minus(invoice.paidAmount || 0).toNumber() : 0;

  useEffect(() => {
    if (invoice) {
      setAmount(remainingBalance.toString());
    }
  }, [invoice, remainingBalance]);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) return toast.error("Please enter a valid amount");
    if (!method) return toast.error("Please select a payment method");

    setIsSubmitting(true);
    const toastId = toast.loading("Recording payment...");

    try {
      const result = await recordPayment(invoice.id, {
        amount: new Decimal(amount).toNumber(), 
        method: method, 
        notes, 
        paidAt: new Date(date)
      });

      if (result.success) {
        toast.success("Payment recorded successfully", { id: toastId });
        setAmount("");
        setNotes("");
        onClose();
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-[32px] border-0 shadow-2xl">
        <div className="bg-emerald-600 p-8 text-white relative">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
              <CreditCard className="w-6 h-6" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Record Payment</DialogTitle>
              <p className="text-emerald-100 text-sm font-medium mt-1">
                For Invoice {invoice.displayId || invoice.id.substring(0, 8).toUpperCase()}
              </p>
            </DialogHeader>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10 text-white">
            {/* Simple placeholder for Coins icon or similar if needed */}
          </div>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh]">
          <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <div>
              <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Remaining Balance</p>
              <p className="text-2xl font-black text-emerald-700">${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setAmount(remainingBalance.toString())}
              className="rounded-xl border-emerald-200 text-emerald-600 font-black text-[10px] h-8 bg-white hover:bg-emerald-50"
            >
              PAY FULL
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Amount to Pay</Label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-11 h-14 rounded-xl border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 font-black text-xl"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMethod(item.id as PaymentMethod)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center",
                      method === item.id 
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500" 
                        : "border-gray-100 hover:border-emerald-200 hover:bg-gray-50 text-gray-600"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", method === item.id ? "text-emerald-500" : "text-gray-400")} />
                    <span className="text-[10px] font-black uppercase">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-9 h-10 rounded-xl border-gray-200 text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Notes (Optional)</Label>
              <Textarea
                placeholder="Transaction reference, check number, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl border-gray-200 min-h-[80px] text-sm resize-none"
              />
            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50 flex gap-3 border-t border-gray-100">
          <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl font-bold text-gray-500 h-12">Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-black shadow-lg shadow-emerald-100 transition-all active:scale-95"
          >
            {isSubmitting ? "RECORDING..." : "Record Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
