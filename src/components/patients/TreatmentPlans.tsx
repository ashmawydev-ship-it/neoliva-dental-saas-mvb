"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, PlayCircle, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp, DollarSign, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getTreatmentPlans, createTreatmentPlan, deleteTreatmentPlan, updatePlanStatus, addTreatmentPhase, updatePhaseStatus, deleteTreatmentPhase, getDoctors } from "@/app/actions/treatment-plans";
import { generateInvoiceFromPlan } from "@/app/actions/billing";
import { ToothSelector } from "@/components/shared/ToothSelector";
import { ServiceCombobox } from "@/components/shared/ServiceCombobox";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ============ TYPES ============
type PhaseStatus = "Completed" | "In Progress" | "Planned" | "Cancelled";
type PlanStatus = "Active" | "Completed" | "On Hold" | "Cancelled";

interface Phase {
  id: string;
  step: number;
  name: string;
  status: PhaseStatus;
  date: string;
  price: number; // Changed to number for internal logic
  notes: string;
  serviceId?: string;
  doctorId?: string | null;
  doctorName?: string | null;
  toothList?: string[];
}

interface Plan {
  id: string;
  title: string;
  status: PlanStatus;
  progress: number;
  cost: number; // Changed to number
  created: string;
  notes: string;
  invoices?: { id: string, displayId: string }[];
  phases: Phase[];
}

// ============ CONFIG ============
const PLAN_STATUS_COLORS: Record<PlanStatus, { bg: string; text: string; border: string }> = {
  Active:    { bg: "bg-blue-100 dark:bg-blue-900/30",    text: "text-blue-800 dark:text-blue-400",    border: "ring-blue-100 dark:ring-blue-900/50" },
  Completed: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-800 dark:text-emerald-400", border: "ring-emerald-100 dark:ring-emerald-900/50" },
  "On Hold": { bg: "bg-amber-100 dark:bg-amber-900/30",   text: "text-amber-800 dark:text-amber-400",   border: "ring-amber-100 dark:ring-amber-900/50" },
  Cancelled: { bg: "bg-red-100 dark:bg-red-900/30",     text: "text-red-800 dark:text-red-400",     border: "ring-red-100 dark:ring-red-900/50" },
};

const PHASE_STATUS_ICONS: Record<PhaseStatus, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  Completed:   { icon: CheckCircle2, color: "text-white",     bg: "bg-emerald-500 dark:bg-emerald-600" },
  "In Progress": { icon: PlayCircle, color: "text-white",     bg: "bg-blue-500 dark:bg-blue-600" },
  Planned:     { icon: Clock,        color: "text-gray-500 dark:text-gray-400",  bg: "bg-gray-200 dark:bg-slate-700" },
  Cancelled:   { icon: X,           color: "text-white",     bg: "bg-red-400 dark:bg-red-500" },
};

const TREATMENT_PRESETS = [
  "Initial Consultation & X-Rays", "Root Canal Treatment", "Crown Placing", "Composite Filling",
  "Tooth Extraction", "Dental Implant Placement", "Abutment Placement", "Bridge Fabrication",
  "Orthodontic Adjustment", "Teeth Whitening", "Scaling & Root Planing", "Follow-up Visit",
];

interface PlanStats {
  clinical: number;
  financial: number;
  totalCost: number;
  completedCost: number;
  remainingBalance: number;
}

function calcPlanStats(phases: Phase[]): PlanStats {
  if (phases.length === 0) return { clinical: 0, financial: 0, totalCost: 0, completedCost: 0, remainingBalance: 0 };
  
  const totalPhases = phases.length;
  const completedPhases = phases.filter(p => p.status === "Completed").length;
  const clinicalProgress = Math.round((completedPhases / totalPhases) * 100);

  const totalCost = phases.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  const completedCost = phases.reduce((sum, p) => {
    if (p.status !== "Completed") return sum;
    return sum + (Number(p.price) || 0);
  }, 0);

  const financialProgress = totalCost > 0 ? Math.round((completedCost / totalCost) * 100) : 0;
  const remainingBalance = totalCost - completedCost;

  return {
    clinical: clinicalProgress,
    financial: financialProgress,
    totalCost,
    completedCost,
    remainingBalance
  };
}



export function TreatmentPlans({ 
  patientId,
  onRefresh
}: { 
  patientId: string,
  onRefresh?: () => void
}) {
  const t = useTranslations('treatmentPlans');
  
  const presetLabels = useMemo(() => ({
    "Initial Consultation & X-Rays": t('presets.initialConsultation'),
    "Root Canal Treatment": t('presets.rootCanal'),
    "Crown Placing": t('presets.crownPlacing'),
    "Composite Filling": t('presets.compositeFilling'),
    "Tooth Extraction": t('presets.toothExtraction'),
    "Dental Implant Placement": t('presets.implantPlacement'),
    "Abutment Placement": t('presets.abutmentPlacement'),
    "Bridge Fabrication": t('presets.bridgeFabrication'),
    "Orthodontic Adjustment": t('presets.orthodonticAdj'),
    "Teeth Whitening": t('presets.whitening'),
    "Scaling & Root Planing": t('presets.scalingRootPlaning'),
    "Follow-up Visit": t('presets.followUp'),
  }), [t]);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<{ id: string, name: string }[]>([]);

  async function loadPlans() {
    setLoading(true);
    try {
      const data = await getTreatmentPlans(patientId);
      setPlans(data as Plan[]);
      if (data.length > 0 && !expandedPlan) {
        setExpandedPlan(data[0].id);
      }
      const docs = await getDoctors();
      setDoctors(docs);
    } catch (err) {
      console.error(t('toast.loadFailed'), err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (patientId) {
      loadPlans();
    }
  }, [patientId]);

  // Dialog states
  const [newPlanDialog, setNewPlanDialog] = useState(false);
  const [addPhaseDialog, setAddPhaseDialog] = useState<string | null>(null); // plan id
  const [editPlanDialog, setEditPlanDialog] = useState<string | null>(null); // plan id
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // plan id

  // Forms
  const [newPlan, setNewPlan] = useState({ title: "", notes: "" });
  const [newPlanPhases, setNewPlanPhases] = useState<{ 
    name: string; 
    date: string; 
    price: number;
    notes: string;
    serviceId?: string;
    doctorId?: string;
    toothList?: string[];
  }[]>([]);
  const [inlinePhase, setInlinePhase] = useState({ 
    name: "", 
    date: "", 
    price: 0,
    notes: "",
    serviceId: undefined as string | undefined,
    doctorId: undefined as string | undefined,
    toothList: [] as string[]
  });
  const [newPhase, setNewPhase] = useState({ 
    name: "", 
    date: "", 
    price: 0, 
    notes: "",
    serviceId: undefined as string | undefined,
    doctorId: undefined as string | undefined,
    toothList: [] as string[]
  });

  const newPlanTotalCost = newPlanPhases.reduce((s, p) => {
    const n = typeof p.price === 'number' ? p.price : parseFloat(String(p.price).replace(/[^0-9.]/g, ""));
    return s + (isNaN(n) ? 0 : n);
  }, 0);

  const addInlinePhase = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!inlinePhase.name?.trim()) return;
    setNewPlanPhases(prev => [...prev, { ...inlinePhase }]);
    setInlinePhase({ name: "", date: "", price: 0, notes: "", serviceId: undefined, doctorId: undefined, toothList: [] });
  };

  const removeInlinePhase = (idx: number) => {
    setNewPlanPhases(prev => prev.filter((_, i) => i !== idx));
  };

  // ============ HANDLERS ============
  const handleAddPlan = async () => {
    if (!newPlan.title) return;
    const planData = {
      title: newPlan.title,
      status: "Active",
      notes: newPlan.notes,
      phases: newPlanPhases.map(p => ({
        name: p.name,
        date: p.date,
        price: p.price.toString(),
        status: "Planned",
        serviceId: p.serviceId,
        doctorId: p.doctorId,
        toothList: p.toothList,
        notes: p.notes
      }))
    };
    
    const res = await createTreatmentPlan(patientId, planData);
    if (res.success) {
      await loadPlans();
      setExpandedPlan(res.data.id);
      onRefresh?.();
    }
    
    setNewPlanDialog(false);
    setNewPlan({ title: "", notes: "" });
    setNewPlanPhases([]);
    setInlinePhase({ name: "", date: "", price: 0, notes: "", serviceId: undefined, doctorId: undefined, toothList: [] });
  };

  const handleDeletePlan = async (id: string) => {
    const res = await deleteTreatmentPlan(id, patientId);
    if (res.success) {
      setPlans(prev => prev.filter(p => p.id !== id));
      onRefresh?.();
    }
    setDeleteConfirm(null);
  };

  const handleAddPhase = async (planId: string) => {
    if (!newPhase.name) return;
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    const step = plan.phases.length + 1;
    const phaseData = {
      ...newPhase,
      price: newPhase.price.toString()
    };
    const res = await addTreatmentPhase(planId, phaseData, step, patientId);
    if (res.success) {
      await loadPlans();
      onRefresh?.();
    }
    
    setNewPhase({ 
      name: "", 
      date: "", 
      price: 0, 
      notes: "",
      serviceId: undefined,
      doctorId: undefined,
      toothList: []
    });
    setAddPhaseDialog(null);
  };

  const handleDeletePhase = async (planId: string, phaseId: string) => {
    const res = await deleteTreatmentPhase(phaseId, patientId);
    if (res.success) {
      await loadPlans();
      onRefresh?.();
    }
  };

  const cyclePhaseStatus = async (planId: string, phaseId: string) => {
    const statusOrder: PhaseStatus[] = ["Planned", "In Progress", "Completed", "Cancelled"];
    const plan = plans.find(p => p.id === planId);
    const phase = plan?.phases.find(ph => ph.id === phaseId);
    if (!phase) return;
    
    const currentIdx = statusOrder.indexOf(phase.status);
    const nextStatus = statusOrder[(currentIdx + 1) % statusOrder.length];
    
    // Optimistic update
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const updatedPhases = p.phases.map(ph => {
        if (ph.id !== phaseId) return ph;
        return { ...ph, status: nextStatus };
      });
      const stats = calcPlanStats(updatedPhases);
      return { ...p, phases: updatedPhases, progress: stats.clinical };
    }));
    
    const res = await updatePhaseStatus(phaseId, nextStatus, patientId);
    if (res.success) {
      onRefresh?.();
    } else {
      // Revert if failed (simplified: just reload)
      await loadPlans();
    }
  };

  const changePlanStatus = async (planId: string, status: PlanStatus) => {
    const res = await updatePlanStatus(planId, status, patientId);
    if (res.success) {
      setPlans(prev => prev.map(p => p.id === planId ? { ...p, status } : p));
      onRefresh?.();
    }
    setEditPlanDialog(null);
  };

  const handleGenerateInvoice = async (planId: string) => {
    try {
      const res = await generateInvoiceFromPlan(planId);
      if (res) {
        await loadPlans();
        onRefresh?.();
        alert(t('toast.invoiceGenerated'));
      }
    } catch (err) {
      console.error("Failed to generate invoice", err);
      alert(t('toast.invoiceFailed'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('title')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setNewPlanDialog(true)} className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md text-white font-medium">
          <Plus className="w-4 h-4 mr-2" /> {t('newPlan')}
        </Button>
      </div>

      {/* Plans Summary */}
      {plans.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center dark:bg-blue-900/20 dark:border-blue-900/50">
            <p className="text-xl font-black text-blue-700 dark:text-blue-400">{plans.filter(p => p.status === "Active").length}</p>
            <p className="text-[10px] text-blue-500 font-medium dark:text-blue-500">{t('stats.activePlans')}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center dark:bg-emerald-900/20 dark:border-emerald-900/50">
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">{plans.filter(p => p.status === "Completed").length}</p>
            <p className="text-[10px] text-emerald-500 font-medium dark:text-emerald-500">{t('stats.completed')}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center dark:bg-slate-800/50 dark:border-slate-700">
            <p className="text-xl font-black text-gray-700 dark:text-gray-300">{plans.reduce((s, p) => s + p.phases.length, 0)}</p>
            <p className="text-[10px] text-gray-500 font-medium dark:text-gray-400">{t('stats.totalPhases')}</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-center dark:bg-purple-900/20 dark:border-purple-900/50">
            <p className="text-xl font-black text-purple-700 dark:text-purple-400">
              ${plans.reduce((s, p) => {
                const n = typeof p.cost === 'number' ? p.cost : parseFloat(String(p.cost).replace(/[^0-9.]/g, ""));
                return s + (isNaN(n) ? 0 : n);
              }, 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-purple-500 font-medium dark:text-purple-500">{t('stats.totalCost')}</p>
          </div>
        </div>
      )}

      {/* Plans List */}
      <div className="grid gap-6">
        {plans.length > 0 ? plans.map((plan) => {
          const isExpanded = expandedPlan === plan.id;
          const sc = PLAN_STATUS_COLORS[plan.status];
          return (
            <Card key={plan.id} className={`border-0 shadow-sm overflow-hidden bg-white dark:bg-slate-900 ${plan.status === "Active" ? "ring-2 " + sc.border : "dark:border dark:border-slate-800"}`}>
              <CardContent className="p-0">
                {/* Plan Header */}
                <div
                  className={`p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between cursor-pointer transition-colors ${
                    plan.status === "Active" ? "bg-blue-50/30 dark:bg-blue-900/10" : plan.status === "Completed" ? "bg-emerald-50/20 dark:bg-emerald-900/10" : "bg-gray-50/50 dark:bg-slate-800/50"
                  }`}
                  onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className="text-base font-bold text-gray-900 dark:text-white">{plan.title}</h4>
                      <Badge className={`rounded-full text-[10px] ${sc.bg} ${sc.text} border-0`}>
                        {plan.status === "Active" ? <PlayCircle className="w-3 h-3 mr-1" /> : plan.status === "Completed" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : plan.status === "On Hold" ? <Clock className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                        {t(`status.${plan.status}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{t('plan.meta', { id: plan.id, date: plan.created })}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">{t('plan.estCost')}</p>
                      <p className="text-lg font-bold text-emerald-600">${Number(plan.cost).toLocaleString()}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-5 animate-fade-in-up">
                    {/* Progress Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="flex flex-col p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{t('plan.clinicalProgress')}</p>
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <p className="text-2xl font-black text-blue-900 dark:text-blue-100 leading-none">{calcPlanStats(plan.phases).clinical}%</p>
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">{t('plan.phases', { done: plan.phases.filter(p => p.status === 'Completed').length, total: plan.phases.length })}</p>
                        </div>
                        <div className="w-full h-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-full mt-3 overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${calcPlanStats(plan.phases).clinical}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">{t('plan.financialProgress')}</p>
                          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100 leading-none">{calcPlanStats(plan.phases).financial}%</p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{t('plan.balance', { amount: Number(calcPlanStats(plan.phases).remainingBalance).toLocaleString() })}</p>
                        </div>
                        <div className="w-full h-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-full mt-3 overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${calcPlanStats(plan.phases).financial}%` }}
                          />
                        </div>
                      </div>
                    </div>


                    {/* Phases Timeline */}
                    {plan.phases.length > 0 ? (
                      <div className="space-y-3 relative before:content-[''] before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:to-gray-100 dark:before:from-blue-900/50 dark:before:to-slate-800">
                        {plan.phases.map((phase) => {
                          const phConfig = PHASE_STATUS_ICONS[phase.status];
                          const Icon = phConfig.icon;
                          return (
                            <div key={phase.id} className="flex gap-4 relative group">
                              {/* Status dot — click to cycle */}
                              <button
                                onClick={() => cyclePhaseStatus(plan.id, phase.id)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-4 border-white z-10 transition-all hover:scale-110 hover:shadow-md ${phConfig.bg}`}
                                title="Click to change status"
                              >
                                <Icon className={`w-4 h-4 ${phConfig.color}`} />
                              </button>
                              <div className="flex-1 bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow dark:bg-slate-800/50 dark:border-slate-800">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold ${phase.status === 'Completed' ? 'text-gray-900 dark:text-white' : phase.status === 'Cancelled' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-600 dark:text-slate-300'}`}>
                                    {phase.step}. {presetLabels[phase.name as keyof typeof presetLabels] || phase.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <p className="text-xs text-gray-400">{phase.date}</p>
                                    {phase.doctorName && (
                                      <p className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md font-medium dark:bg-blue-900/30 dark:text-blue-400">Dr. {phase.doctorName}</p>
                                    )}
                                    {phase.toothList && phase.toothList.length > 0 && (
                                      <div className="flex gap-1 items-center">
                                        <span className="text-[9px] text-gray-300 font-bold ml-1">•</span>
                                        {phase.toothList.map(t => (
                                          <Badge key={t} variant="outline" className="text-[9px] px-1 py-0 rounded-md bg-blue-50/30 text-blue-500 border-blue-100">
                                            #{t}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 rounded-full
                                      ${phase.status === "Completed" ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400" :
                                        phase.status === "In Progress" ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400" :
                                        phase.status === "Cancelled" ? "bg-red-50 text-red-500 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400" :
                                        "bg-gray-50 text-gray-500 border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"}`}
                                    >
                                      {t(`phaseStatus.${phase.status}`)}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <p className={`text-sm font-bold ${phase.status === 'Completed' ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    ${Number(phase.price).toLocaleString()}
                                  </p>
                                  <button
                                    onClick={() => handleDeletePhase(plan.id, phase.id)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 dark:bg-slate-800/50 dark:border-slate-700">
                        <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">{t('empty.noPhases')}</p>
                        <p className="text-xs text-gray-300 mt-1">{t('empty.noPhasesHint')}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-slate-800">
                      <Button
                        size="sm"
                        onClick={() => handleGenerateInvoice(plan.id)}
                        disabled={plan.invoices && plan.invoices.length > 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-8 text-xs font-semibold shadow-sm"
                      >
                        <DollarSign className="w-3.5 h-3.5 mr-1.5" /> 
                        {plan.invoices && plan.invoices.length > 0 ? t('footer.invoiceGenerated') : t('footer.generateInvoice')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setAddPhaseDialog(plan.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-8 text-xs font-semibold shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> {t('footer.addPhase')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditPlanDialog(plan.id)}
                        className="rounded-lg h-8 text-xs font-semibold"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1.5" /> {t('footer.changeStatus')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirm(plan.id)}
                        className="rounded-lg h-8 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> {t('footer.deletePlan')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        }) : (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400 dark:text-slate-500">{t('empty.noPlans')}</p>
            <Button size="sm" variant="link" onClick={() => setNewPlanDialog(true)} className="text-blue-600 dark:text-blue-400 text-xs mt-1">{t('empty.createFirst')}</Button>
          </div>
        )}
      </div>

      {/* ==================== DIALOGS ==================== */}

      {/* New Plan Dialog */}
      <Dialog open={newPlanDialog} onOpenChange={setNewPlanDialog}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 m-0">
            <DialogTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" /> {t('dialog.newPlan')}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Plan Info */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dialog.treatmentTitle')}</label>
              <input
                type="text"
                value={newPlan.title}
                onChange={(e) => setNewPlan(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Root Canal & Crown (Tooth #16)"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dialog.clinicalNotes')}</label>
              <textarea
                value={newPlan.notes}
                onChange={(e) => setNewPlan(p => ({ ...p, notes: e.target.value }))}
                placeholder="Additional details about the treatment plan..."
                className="w-full h-16 rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

            {/* ---- Treatment Phases Section ---- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dialog.treatmentPhases')}</label>
                <div className="flex items-center gap-3">
                  {newPlanPhases.length > 0 && (
                    <Badge variant="outline" className="text-[9px] text-emerald-600 bg-emerald-50 border-emerald-200">
                      {t('dialog.estCost', { cost: Number(newPlanTotalCost).toLocaleString() })}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[9px]">{t('dialog.nPhases', { n: newPlanPhases.length })}</Badge>
                </div>
              </div>

              {/* Added phases list */}
              {newPlanPhases.length > 0 && (
                <div className="space-y-2">
                  {newPlanPhases.map((ph, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 group dark:bg-slate-800/50 dark:border-slate-800">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0 dark:bg-blue-900/50 dark:text-blue-400">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate dark:text-white">{presetLabels[ph.name as keyof typeof presetLabels] || ph.name}</p>
                        <p className="text-[10px] text-gray-400">{ph.date || "TBD"} · {ph.price || "$0"}</p>
                      </div>
                      <button onClick={() => removeInlinePhase(idx)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick select presets */}
              <div className="flex flex-wrap gap-1.5">
                {TREATMENT_PRESETS.filter(tp => !newPlanPhases.find(p => p.name === tp)).slice(0, 10).map(tp => (
                  <button key={tp} onClick={() => setInlinePhase(p => ({ ...p, name: tp }))}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                      inlinePhase.name === tp ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-blue-900/30"
                    }`}>{presetLabels[tp as keyof typeof presetLabels] || tp}</button>
                ))}
              </div>

              {/* Inline add phase form */}
              <div className="space-y-3 p-3 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <ServiceCombobox 
                      selectedServiceId={inlinePhase.serviceId}
                      onSelect={(service) => setInlinePhase(p => ({ 
                        ...p, 
                        name: service.name, 
                        serviceId: service.id,
                        price: Number(service.price)
                      }))}
                      className="w-full h-9"
                    />
                  </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 rounded-lg border-blue-200 bg-white text-blue-600 hover:bg-blue-50 dark:bg-slate-800 dark:border-blue-900/50 dark:hover:bg-blue-900/30 dark:text-blue-400">
                          {inlinePhase.toothList.length > 0 ? (
                            <Badge className="bg-blue-600 text-white hover:bg-blue-600 px-1.5 py-0 h-5">
                              {t('dialog.nTeeth', { n: inlinePhase.toothList.length })}
                            </Badge>
                          ) : (
                            t('dialog.selectTeeth')
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[700px] p-4 rounded-2xl shadow-xl dark:bg-slate-900 dark:border-slate-800" align="center">
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">{t('dialog.selectAffectedTeeth')}</p>
                          <ToothSelector 
                            className="border-0 bg-transparent shadow-none p-0"
                            selectedTeeth={inlinePhase.toothList}
                            onChange={(teeth) => setInlinePhase(p => ({ ...p, toothList: teeth }))}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <select
                    value={inlinePhase.doctorId || ""}
                    onChange={(e) => setInlinePhase(p => ({ ...p, doctorId: e.target.value || undefined }))}
                    className="h-9 px-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="">{t('dialog.providerOptional')}</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={inlinePhase.date}
                    onChange={(e) => setInlinePhase(p => ({ ...p, date: e.target.value }))}
                    placeholder="Date"
                    className="h-9 px-3 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                   <CurrencyInput 
                    value={inlinePhase.price}
                    onChange={(val) => setInlinePhase(p => ({ ...p, price: val }))}
                    className="h-9"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={(e) => addInlinePhase(e)}
                    disabled={!inlinePhase.name?.trim()}
                    className="h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> {t('dialog.add')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Create Button */}
            <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => { setNewPlanDialog(false); setNewPlanPhases([]); setInlinePhase({ name: "", date: "", price: 0, notes: "", serviceId: undefined, doctorId: undefined, toothList: [] }); }} className="flex-1 rounded-xl h-11 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-white">{t('dialog.cancel')}</Button>
              <Button onClick={handleAddPlan} disabled={!newPlan.title.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 font-semibold shadow-md shadow-blue-500/20">
                <Save className="w-4 h-4 mr-2" /> {t('dialog.createPlan')}
                {newPlanPhases.length > 0 && (
                  <Badge className="ml-2 bg-white/20 text-white text-[9px]">{t('dialog.nPhases', { n: newPlanPhases.length })}</Badge>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Phase Dialog */}
      <Dialog open={addPhaseDialog !== null} onOpenChange={(o) => !o && setAddPhaseDialog(null)}>
        <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
          <DialogHeader className="px-6 py-4 border-b border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 m-0">
            <DialogTitle className="text-lg font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" /> {t('dialog.addPhase')}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            {/* Quick presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dialog.quickSelect')}</label>
              <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                {TREATMENT_PRESETS.map(tp => (
                  <button key={tp} onClick={() => setNewPhase(p => ({ ...p, name: tp }))}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                      newPhase.name === tp ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}>{presetLabels[tp as keyof typeof presetLabels] || tp}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dialog.service')}</label>
              <ServiceCombobox 
                selectedServiceId={newPhase.serviceId}
                onSelect={(service) => setNewPhase(p => ({ 
                  ...p, 
                  name: service.name, 
                  serviceId: service.id,
                  price: Number(service.price)
                }))}
                className="w-full"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dialog.teethSelection')}</label>
              <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 dark:bg-slate-800/50 dark:border-slate-800">
                <ToothSelector 
                  className="border-0 bg-transparent shadow-none p-0"
                  selectedTeeth={newPhase.toothList || []}
                  onChange={(teeth) => setNewPhase(p => ({ ...p, toothList: teeth }))}
                />
                {newPhase.toothList && newPhase.toothList.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {newPhase.toothList.map(t => (
                      <Badge key={t} variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">
                        #{t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dialog.provider')}</label>
                <select
                  value={newPhase.doctorId || ""}
                  onChange={(e) => setNewPhase(p => ({ ...p, doctorId: e.target.value || undefined }))}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                >
                  <option value="">{t('dialog.none')}</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dialog.date')}</label>
                <input type="text" value={newPhase.date} onChange={(e) => setNewPhase(p => ({ ...p, date: e.target.value }))} placeholder="Apr 15, 2024" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dialog.price')}</label>
                <CurrencyInput 
                  value={newPhase.price}
                  onChange={(val) => setNewPhase(p => ({ ...p, price: val }))}
                  className="h-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dialog.notes')}</label>
              <textarea value={newPhase.notes} onChange={(e) => setNewPhase(p => ({ ...p, notes: e.target.value }))} placeholder="Phase details..." className="w-full h-16 rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
            <Button onClick={() => addPhaseDialog && handleAddPhase(addPhaseDialog)} disabled={!newPhase.name.trim()} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 font-semibold shadow-md shadow-emerald-500/20">
              <Save className="w-4 h-4 mr-2" /> {t('dialog.addPhaseBtn')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={editPlanDialog !== null} onOpenChange={(o) => !o && setEditPlanDialog(null)}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 m-0">
            <DialogTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-600" /> {t('dialog.changeStatus')}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 grid grid-cols-2 gap-3">
            {(["Active", "Completed", "On Hold", "Cancelled"] as PlanStatus[]).map(s => {
              const c = PLAN_STATUS_COLORS[s];
              const isActive = editPlanDialog ? plans.find(p => p.id === editPlanDialog)?.status === s : false;
              return (
                <button
                  key={s}
                  onClick={() => editPlanDialog && changePlanStatus(editPlanDialog, s)}
                  className={`p-4 rounded-xl border-2 text-sm font-bold transition-all ${
                    isActive ? `${c.bg} ${c.text} border-current ring-2 ring-offset-2 ring-blue-300 dark:ring-blue-900` : `bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700`
                  }`}
                >{t(`status.${s}`)}</button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('dialog.deleteConfirmTitle')}</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('dialog.deleteConfirmDesc')}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl dark:border-slate-700 dark:hover:bg-slate-800 dark:text-white">{t('dialog.cancel')}</Button>
              <Button onClick={() => deleteConfirm && handleDeletePlan(deleteConfirm)} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md shadow-red-500/20">
                {t('dialog.delete')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
