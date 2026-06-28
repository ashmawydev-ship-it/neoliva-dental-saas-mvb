"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDoctorCommissionRateAction } from "@/app/actions/doctor-commission";
import { Percent, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface CommissionRateDialogProps {
  staffId: string;
  staffName: string;
  currentRate: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommissionRateDialog({
  staffId,
  staffName,
  currentRate,
  open,
  onOpenChange,
}: CommissionRateDialogProps) {
  const [rate, setRate] = useState(currentRate.toString());
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const numRate = parseFloat(rate);
    if (isNaN(numRate) || numRate < 0 || numRate > 100) {
      toast.error("Commission rate must be between 0 and 100");
      return;
    }

    startTransition(async () => {
      try {
        await updateDoctorCommissionRateAction(staffId, numRate);
        setSaved(true);
        toast.success(`Commission rate updated to ${numRate}%`);
        setTimeout(() => {
          setSaved(false);
          onOpenChange(false);
        }, 1200);
      } catch (error) {
        toast.error("Failed to update commission rate");
        console.error(error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-2xl border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-950 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Percent className="w-5 h-5 text-blue-500" />
            </div>
            Doctor Commission Rate
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Set the commission percentage for <span className="font-semibold text-slate-700 dark:text-slate-300">{staffName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="commission-rate" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Commission Rate (%)
            </Label>
            <div className="relative">
              <Input
                id="commission-rate"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="pr-10 h-12 text-lg font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500/30"
                placeholder="e.g. 15"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                %
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Current rate: <span className="font-semibold text-slate-600 dark:text-slate-300">{currentRate}%</span>
            </p>
          </div>

          {/* Preview */}
          {parseFloat(rate) > 0 && (
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/5 dark:to-indigo-500/5 border border-blue-100 dark:border-blue-500/10">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                💡 For a $1,000 invoice, the commission would be{" "}
                <span className="font-bold">${(1000 * parseFloat(rate) / 100).toFixed(2)}</span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || saved}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md min-w-[100px]"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <><CheckCircle2 className="w-4 h-4 mr-1" /> Saved</>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
