"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2,
  Banknote,
  TrendingUp,
  Wallet,
  Eye,
} from "lucide-react";
import {
  getDoctorCommissionSummaryAction,
  payDoctorCommissionsAction,
} from "@/app/actions/doctor-commission";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DoctorSummary {
  doctorId: string;
  doctorName: string;
  commissionRate: number;
  earned: number;
  paid: number;
  pending: number;
}

interface CommissionDetail {
  id: string;
  invoiceId: string | null;
  invoiceDisplayId: string | null;
  invoiceAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface DoctorFullSummary extends DoctorSummary {
  commissions: CommissionDetail[];
}

// ─── KPI Cards ──────────────────────────────────────────────────────────────

export function CommissionKPIs({ doctors }: { doctors: DoctorSummary[] }) {
  const totalEarned = doctors.reduce((sum, d) => sum + d.earned, 0);
  const totalPaid = doctors.reduce((sum, d) => sum + d.paid, 0);
  const totalPending = doctors.reduce((sum, d) => sum + d.pending, 0);
  const doctorCount = doctors.length;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  const kpis = [
    {
      title: "إجمالي العمولات",
      subtitle: "Total Earned",
      value: formatCurrency(totalEarned),
      icon: TrendingUp,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      gradient: "from-blue-500/5 to-indigo-500/5",
    },
    {
      title: "العمولات المدفوعة",
      subtitle: "Paid Out",
      value: formatCurrency(totalPaid),
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      gradient: "from-emerald-500/5 to-teal-500/5",
    },
    {
      title: "العمولات المعلقة",
      subtitle: "Pending",
      value: formatCurrency(totalPending),
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      gradient: "from-amber-500/5 to-orange-500/5",
    },
    {
      title: "عدد الدكاترة",
      subtitle: "Active Doctors",
      value: doctorCount.toString(),
      icon: Users,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      gradient: "from-violet-500/5 to-purple-500/5",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, i) => (
        <Card
          key={i}
          className={`relative overflow-hidden p-5 flex flex-col gap-3 hover:shadow-lg transition-all duration-300 border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-br ${kpi.gradient} dark:bg-slate-900`}
        >
          <div className="flex items-center justify-between">
            <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.title}</p>
            <h3 className="text-2xl font-bold tracking-tight mt-1 text-slate-900 dark:text-white">
              {kpi.value}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{kpi.subtitle}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Pay Confirmation Dialog ─────────────────────────────────────────────────

function PayDialog({
  open,
  onOpenChange,
  doctorId,
  doctorName,
  amount,
  commissionIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: string;
  doctorName: string;
  amount: number;
  commissionIds: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handlePay = () => {
    startTransition(async () => {
      try {
        await payDoctorCommissionsAction(doctorId, commissionIds);
        toast.success(`Paid ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)} to ${doctorName}`);
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error("Payment failed. Please try again.");
        console.error(error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-2xl border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-950 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <Banknote className="w-5 h-5 text-emerald-500" />
            </div>
            Pay Doctor Commission
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Confirm commission payment to{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{doctorName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/5 dark:to-teal-500/5 border border-emerald-100 dark:border-emerald-500/10 text-center">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Amount to Pay</p>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)}
            </p>
            <p className="text-xs text-emerald-500 mt-1">
              {commissionIds.length} commission{commissionIds.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ⚡ This will create an <strong>Expense</strong> record and record a <strong>Journal Entry</strong> debiting the liability account.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl" disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handlePay}
            disabled={isPending}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md min-w-[120px]"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Banknote className="w-4 h-4 mr-1.5" /> Confirm Pay</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Commission Details Panel ────────────────────────────────────────────────

function CommissionDetails({ doctorId }: { doctorId: string }) {
  const [details, setDetails] = useState<DoctorFullSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    getDoctorCommissionSummaryAction(doctorId).then((data) => {
      setDetails(data as DoctorFullSummary);
      setLoading(false);
    });
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">Loading details...</span>
      </div>
    );
  }

  if (!details?.commissions?.length) {
    return (
      <div className="text-center py-6 text-sm text-slate-400">
        No commission records yet.
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50/50">
            <TableHead className="text-[11px] font-semibold text-slate-500 uppercase">Invoice</TableHead>
            <TableHead className="text-[11px] font-semibold text-slate-500 uppercase">Invoice Amount</TableHead>
            <TableHead className="text-[11px] font-semibold text-slate-500 uppercase">Rate</TableHead>
            <TableHead className="text-[11px] font-semibold text-slate-500 uppercase">Commission</TableHead>
            <TableHead className="text-[11px] font-semibold text-slate-500 uppercase">Date</TableHead>
            <TableHead className="text-[11px] font-semibold text-slate-500 uppercase">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {details.commissions.map((c) => (
            <TableRow key={c.id} className="border-slate-100 dark:border-slate-800/50">
              <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-300">
                {c.invoiceDisplayId || c.invoiceId?.slice(0, 8) || "—"}
              </TableCell>
              <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {formatCurrency(c.invoiceAmount)}
              </TableCell>
              <TableCell className="text-xs text-slate-500">{c.commissionRate}%</TableCell>
              <TableCell className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(c.commissionAmount)}
              </TableCell>
              <TableCell className="text-xs text-slate-400">
                {new Date(c.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Badge
                  className={`text-[10px] font-semibold rounded-full px-2 border-none shadow-none ${
                    c.status === "paid"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {c.status === "paid" ? "✓ Paid" : "⏳ Pending"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main Table ──────────────────────────────────────────────────────────────

export function DoctorsCommissionTable({ doctors }: { doctors: DoctorSummary[] }) {
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<{
    open: boolean;
    doctorId: string;
    doctorName: string;
    amount: number;
    commissionIds: string[];
  } | null>(null);
  const [loadingPayIds, setLoadingPayIds] = useState<string | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  const handlePayNow = async (doctor: DoctorSummary) => {
    setLoadingPayIds(doctor.doctorId);
    try {
      // Fetch pending commissions to get IDs
      const details = (await getDoctorCommissionSummaryAction(doctor.doctorId)) as DoctorFullSummary;
      const pendingIds = details.commissions
        .filter((c) => c.status === "pending")
        .map((c) => c.id);

      if (!pendingIds.length) {
        toast.info("No pending commissions to pay");
        return;
      }

      setPayDialog({
        open: true,
        doctorId: doctor.doctorId,
        doctorName: doctor.doctorName,
        amount: doctor.pending,
        commissionIds: pendingIds,
      });
    } catch (error) {
      toast.error("Failed to load commission details");
    } finally {
      setLoadingPayIds(null);
    }
  };

  if (!doctors.length) {
    return (
      <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 p-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Wallet className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No Commissions Yet</h3>
          <p className="text-sm text-slate-400 max-w-sm">
            When payments are recorded on invoices assigned to doctors, commissions will appear here automatically.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 dark:bg-slate-800/30 hover:bg-slate-50/80">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Doctor</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Earned</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doc) => (
                <>
                  <TableRow
                    key={doc.doctorId}
                    className="border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                          {doc.doctorName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">{doc.doctorName}</p>
                          <p className="text-[11px] text-slate-400">🩺 Doctor</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none text-xs font-bold rounded-full px-2.5 shadow-none">
                        {doc.commissionRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(doc.earned)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(doc.paid)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-bold ${doc.pending > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>
                        {formatCurrency(doc.pending)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {doc.pending > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handlePayNow(doc)}
                            disabled={loadingPayIds === doc.doctorId}
                            className="h-8 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs shadow-sm"
                          >
                            {loadingPayIds === doc.doctorId ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <Banknote className="w-3.5 h-3.5 mr-1" /> Pay Now
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedDoctor(expandedDoctor === doc.doctorId ? null : doc.doctorId)}
                          className="h-8 rounded-lg text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Details
                          {expandedDoctor === doc.doctorId ? (
                            <ChevronUp className="w-3 h-3 ml-1" />
                          ) : (
                            <ChevronDown className="w-3 h-3 ml-1" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expandable Details Row */}
                  {expandedDoctor === doc.doctorId && (
                    <TableRow key={`${doc.doctorId}-details`} className="bg-slate-50/50 dark:bg-slate-800/10">
                      <TableCell colSpan={6} className="p-0">
                        <div className="px-6 py-4 border-t border-dashed border-slate-200 dark:border-slate-700">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                            📋 Commission History — {doc.doctorName}
                          </h4>
                          <CommissionDetails doctorId={doc.doctorId} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pay Dialog */}
      {payDialog && (
        <PayDialog
          open={payDialog.open}
          onOpenChange={(open) => !open && setPayDialog(null)}
          doctorId={payDialog.doctorId}
          doctorName={payDialog.doctorName}
          amount={payDialog.amount}
          commissionIds={payDialog.commissionIds}
        />
      )}
    </>
  );
}
