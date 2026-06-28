"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Activity as ActivityIcon, Heart, Pill, Plus, Trash2, Save, Edit2, X,
  Syringe, ShieldAlert, Clock, FileText, Droplets, AlertTriangle, CheckCircle2, Cigarette, Wine
} from "lucide-react";

// ============ TYPES ============
type ConditionStatus = "Controlled" | "Managed" | "Monitoring" | "Active" | "Resolved";
type AllergySeverity = "Severe" | "Moderate" | "Mild";
type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "";

interface MedicalCondition {
  id: string;
  name: string;
  diagnosed: string;
  status: ConditionStatus;
  notes: string;
}

interface Allergy {
  id: string;
  name: string;
  severity: AllergySeverity;
  reaction: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedFor: string;
}

interface Surgery {
  id: string;
  name: string;
  date: string;
  notes: string;
}

interface FamilyHistory {
  id: string;
  condition: string;
  relation: string;
}

interface PatientInput {
  id: string;
  bloodGroup?: string;
  smokingStatus?: string;
  alcoholUse?: string;
  generalMedicalNotes?: string;
  conditions: any[];
  allergies: any[];
  medications: any[];
  surgeries: any[];
  familyHistory: any[];
}

// ============ CONFIG ============
const STATUS_CONFIGS: Record<ConditionStatus, { color: string; bg: string }> = {
  Controlled: { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/50" },
  Managed: { color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900/50" },
  Monitoring: { color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/50" },
  Active: { color: "text-red-700 dark:text-red-400", bg: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900/50" },
  Resolved: { color: "text-muted-foreground dark:text-slate-400", bg: "bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-700" },
};

const SEVERITY_CONFIGS: Record<AllergySeverity, { color: string; bg: string; icon: string }> = {
  Severe: { color: "text-red-700 dark:text-red-400", bg: "bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/50", icon: "🔴" },
  Moderate: { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/50", icon: "🟡" },
  Mild: { color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/50", icon: "🟢" },
};

const COMMON_CONDITIONS = [
  "Hypertension", "Type 2 Diabetes", "Asthma", "Heart Murmur", "Epilepsy",
  "Thyroid Disorder", "Anemia", "Hepatitis B", "Hepatitis C", "HIV/AIDS",
  "Rheumatic Fever", "Kidney Disease", "Liver Disease", "Osteoporosis",
];

const COMMON_ALLERGIES = [
  "Penicillin", "Amoxicillin", "Sulfa Drugs", "Aspirin", "Ibuprofen",
  "Codeine", "Latex", "Lidocaine", "Novocaine", "Tetracycline",
  "Erythromycin", "NSAIDs", "Shellfish", "Nuts",
];

import { 
  addMedicalCondition, deleteMedicalCondition,
  addAllergy, deleteAllergy,
  addMedication, deleteMedication,
  addSurgery, deleteSurgery,
  addFamilyHistory, deleteFamilyHistory,
  updatePatientVitals, updateGeneralMedicalNotes
} from "@/app/actions/patients";
import { useEffect, useTransition } from "react";

export function MedicalHistory({ patient, onRefresh }: { patient: PatientInput, onRefresh?: () => void }) {
  const t = useTranslations('medicalHistory');
  const [isPending, startTransition] = useTransition();

  // ============ STATE — initialized from patient data ============
  const [conditions, setConditions] = useState<MedicalCondition[]>(() => 
    (patient?.conditions ?? []).map((c: any) => ({
      id: c.id,
      name: c.condition_name || c.name,
      diagnosed: c.diagnosed_date || c.diagnosed || "",
      status: (c.status as ConditionStatus) || "Active",
      notes: c.notes || "",
    }))
  );

  const [allergies, setAllergies] = useState<Allergy[]>(() => 
    (patient?.allergies ?? []).map((a: any) => ({
      id: a.id,
      name: a.allergen || a.name,
      severity: a.severity as AllergySeverity || "Mild",
      reaction: a.reaction || "",
    }))
  );

  const [medications, setMedications] = useState<Medication[]>(() => 
    (patient?.medications ?? []).map((m: any) => ({
      id: m.id,
      name: m.medication_name || m.name,
      dosage: m.dosage || "",
      frequency: m.frequency || "Daily",
      prescribedFor: m.notes || m.prescribedFor || "",
    }))
  );

  const [surgeries, setSurgeries] = useState<Surgery[]>(() => 
    (patient?.surgeries ?? []).map((s: any) => ({
      id: s.id,
      name: s.surgery_name || s.name,
      date: s.surgery_date || s.date || "",
      notes: s.notes || "",
    }))
  );

  const [familyHistory, setFamilyHistory] = useState<FamilyHistory[]>(() => 
    (patient?.familyHistory ?? []).map((fh: any) => ({
      id: fh.id,
      condition: fh.condition_name || fh.condition,
      relation: fh.relation || "",
    }))
  );

  // Lifestyle & vitals
  const [bloodType, setBloodType] = useState<BloodType>((patient?.bloodGroup as BloodType) || "");
  const [smoking, setSmoking] = useState<"Never" | "Former" | "Current">((patient?.smokingStatus as any) || "Never");
  const [alcohol, setAlcohol] = useState<"None" | "Social" | "Regular">((patient?.alcoholUse as any) || "None");
  const [generalNotes, setGeneralNotes] = useState(patient?.generalMedicalNotes || "");
  const [editingNotes, setEditingNotes] = useState(false);

  // ============ SYNC WITH PARENT PROPS ============
  useEffect(() => {
    if (patient) {
      setConditions((patient.conditions ?? []).map((c: any) => ({
        id: c.id,
        name: c.condition_name || c.name,
        diagnosed: c.diagnosed_date || c.diagnosed || "",
        status: (c.status as ConditionStatus) || "Active",
        notes: c.notes || "",
      })));
      setAllergies((patient.allergies ?? []).map((a: any) => ({
        id: a.id,
        name: a.allergen || a.name,
        severity: a.severity as AllergySeverity || "Mild",
        reaction: a.reaction || "",
      })));
      setMedications((patient.medications ?? []).map((m: any) => ({
        id: m.id,
        name: m.medication_name || m.name,
        dosage: m.dosage || "",
        frequency: m.frequency || "Daily",
        prescribedFor: m.notes || m.prescribedFor || "",
      })));
      setSurgeries((patient.surgeries ?? []).map((s: any) => ({
        id: s.id,
        name: s.surgery_name || s.name,
        date: s.surgery_date || s.date || "",
        notes: s.notes || "",
      })));
      setFamilyHistory((patient.familyHistory ?? []).map((fh: any) => ({
        id: fh.id,
        condition: fh.condition_name || fh.condition,
        relation: fh.relation || "",
      })));
      setBloodType((patient.bloodGroup as BloodType) || "");
      setSmoking((patient.smokingStatus as any) || "Never");
      setAlcohol((patient.alcoholUse as any) || "None");
      setGeneralNotes(patient.generalMedicalNotes || "");
    }
  }, [patient]);

  // Dialog states
  const [conditionDialog, setConditionDialog] = useState(false);
  const [allergyDialog, setAllergyDialog] = useState(false);
  const [medicationDialog, setMedicationDialog] = useState(false);
  const [surgeryDialog, setSurgeryDialog] = useState(false);
  const [familyDialog, setFamilyDialog] = useState(false);

  // Forms
  const [newCondition, setNewCondition] = useState<Omit<MedicalCondition, "id">>({ name: "", diagnosed: "", status: "Active", notes: "" });
  const [newAllergy, setNewAllergy] = useState<Omit<Allergy, "id">>({ name: "", severity: "Mild", reaction: "" });
  const [newMedication, setNewMedication] = useState<Omit<Medication, "id">>({ name: "", dosage: "", frequency: "", prescribedFor: "" });
  const [newSurgery, setNewSurgery] = useState<Omit<Surgery, "id">>({ name: "", date: "", notes: "" });
  const [newFamily, setNewFamily] = useState<Omit<FamilyHistory, "id">>({ condition: "", relation: "" });

  // ============ HANDLERS ============
  const addConditionHandler = () => {
    if (!newCondition.name.trim() || !patient?.id) return;
    const tempId = `temp-${Date.now()}`;
    setConditions(prev => [...prev, { ...newCondition, id: tempId }]);
    setConditionDialog(false);
    
    startTransition(async () => {
      await addMedicalCondition(patient.id, newCondition);
      onRefresh?.();
    });
    setNewCondition({ name: "", diagnosed: "", status: "Active", notes: "" });
  };

  const deleteConditionHandler = (id: string) => {
    if (!patient?.id) return;
    setConditions(prev => prev.filter(c => c.id !== id));
    startTransition(async () => {
      if (!id.startsWith('temp-')) {
        await deleteMedicalCondition(id, patient.id);
        onRefresh?.();
      }
    });
  };

  const addAllergyHandler = () => {
    if (!newAllergy.name.trim() || !patient?.id) return;
    const tempId = `temp-${Date.now()}`;
    setAllergies(prev => [...prev, { ...newAllergy, id: tempId }]);
    setAllergyDialog(false);
    
    startTransition(async () => {
      await addAllergy(patient.id, newAllergy);
      onRefresh?.();
    });
    setNewAllergy({ name: "", severity: "Mild", reaction: "" });
  };

  const deleteAllergyHandler = (id: string) => {
    if (!patient?.id) return;
    setAllergies(prev => prev.filter(a => a.id !== id));
    startTransition(async () => {
      if (!id.startsWith('temp-')) {
        await deleteAllergy(id, patient.id);
        onRefresh?.();
      }
    });
  };

  const addMedicationHandler = () => {
    if (!newMedication.name.trim() || !patient?.id) return;
    const tempId = `temp-${Date.now()}`;
    setMedications(prev => [...prev, { ...newMedication, id: tempId }]);
    setMedicationDialog(false);
    
    startTransition(async () => {
      await addMedication(patient.id, newMedication);
      onRefresh?.();
    });
    setNewMedication({ name: "", dosage: "", frequency: "", prescribedFor: "" });
  };

  const deleteMedicationHandler = (id: string) => {
    if (!patient?.id) return;
    setMedications(prev => prev.filter(m => m.id !== id));
    startTransition(async () => {
      if (!id.startsWith('temp-')) {
        await deleteMedication(id, patient.id);
        onRefresh?.();
      }
    });
  };

  const addSurgeryHandler = () => {
    if (!newSurgery.name.trim() || !patient?.id) return;
    const tempId = `temp-${Date.now()}`;
    setSurgeries(prev => [...prev, { ...newSurgery, id: tempId }]);
    setSurgeryDialog(false);
    
    startTransition(async () => {
      await addSurgery(patient.id, newSurgery);
      onRefresh?.();
    });
    setNewSurgery({ name: "", date: "", notes: "" });
  };

  const deleteSurgeryHandler = (id: string) => {
    if (!patient?.id) return;
    setSurgeries(prev => prev.filter(s => s.id !== id));
    startTransition(async () => {
      if (!id.startsWith('temp-')) {
        await deleteSurgery(id, patient.id);
        onRefresh?.();
      }
    });
  };

  const addFamilyHandler = () => {
    if (!newFamily.condition.trim() || !patient?.id) return;
    const tempId = `temp-${Date.now()}`;
    setFamilyHistory(prev => [...prev, { ...newFamily, id: tempId }]);
    setFamilyDialog(false);
    
    startTransition(async () => {
      await addFamilyHistory(patient.id, newFamily);
      onRefresh?.();
    });
    setNewFamily({ condition: "", relation: "" });
  };

  const deleteFamilyHandler = (id: string) => {
    if (!patient?.id) return;
    setFamilyHistory(prev => prev.filter(fh => fh.id !== id));
    startTransition(async () => {
      if (!id.startsWith('temp-')) {
        await deleteFamilyHistory(id, patient.id);
        onRefresh?.();
      }
    });
  };

  const handleUpdateVitals = (type: 'bloodType' | 'smoking' | 'alcohol', val: string) => {
    if (!patient?.id) return;
    
    let newBloodType = bloodType;
    let newSmoking = smoking;
    let newAlcohol = alcohol;
    
    if (type === 'bloodType') {
      newBloodType = val as BloodType;
      setBloodType(newBloodType);
    } else if (type === 'smoking') {
      newSmoking = val as any;
      setSmoking(newSmoking);
    } else if (type === 'alcohol') {
      newAlcohol = val as any;
      setAlcohol(newAlcohol);
    }
    
    startTransition(async () => {
      await updatePatientVitals(patient.id, {
        bloodType: newBloodType,
        smoking: newSmoking,
        alcohol: newAlcohol
      });
      onRefresh?.();
    });
  };

  const saveGeneralNotes = () => {
    if (!patient?.id) return;
    setEditingNotes(false);
    startTransition(async () => {
      await updateGeneralMedicalNotes(patient.id, generalNotes);
      onRefresh?.();
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ========== ROW 1: Conditions + Allergies ========== */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Medical Conditions */}
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between dark:border-slate-800">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2 dark:text-white">
              <ActivityIcon className="w-4 h-4 text-blue-500" /> {t('sections.conditions')}
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setConditionDialog(true)} className="h-7 w-7 p-0 rounded-lg hover:bg-blue-50">
              <Plus className="w-4 h-4 text-blue-600" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {conditions.length > 0 ? conditions.map((cond) => (
              <div key={cond.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 group hover:border-blue-100 transition-colors dark:bg-slate-800/50 dark:border-slate-800 dark:hover:border-blue-800">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{cond.name}</p>
                  <p className="text-xs text-muted-foreground">{t('conditions.diagnosed', { date: cond.diagnosed })}</p>
                  {cond.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{cond.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${STATUS_CONFIGS[cond.status].bg} ${STATUS_CONFIGS[cond.status].color}`}>
                    {t(`conditions.status.${cond.status}`)}
                  </Badge>
                  <button onClick={() => deleteConditionHandler(cond.id)} disabled={isPending} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity disabled:opacity-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-6">
                <ActivityIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('conditions.empty')}</p>
                <Button size="sm" variant="link" onClick={() => setConditionDialog(true)} className="text-blue-600 text-xs mt-1">{t('conditions.addLink')}</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Allergies */}
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between dark:border-slate-800">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2 dark:text-white">
              <Heart className="w-4 h-4 text-red-500" /> {t('sections.allergies')}
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setAllergyDialog(true)} className="h-7 w-7 p-0 rounded-lg hover:bg-red-50">
              <Plus className="w-4 h-4 text-red-500" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {allergies.length > 0 ? allergies.map((allergy) => {
              const config = SEVERITY_CONFIGS[allergy.severity];
              return (
                <div key={allergy.id} className={`flex items-start gap-3 p-3 rounded-xl border group hover:shadow-sm transition-all ${config.bg}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${
                    allergy.severity === "Severe" ? "bg-red-100" : allergy.severity === "Moderate" ? "bg-amber-100" : "bg-emerald-100"
                  }`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${config.color}`}>{allergy.name}</p>
                    <p className={`text-xs mt-0.5 opacity-80 ${config.color}`}>
                      {t(`allergies.severity.${allergy.severity}`)} — {allergy.reaction || t('allergies.noDetails')}
                    </p>
                  </div>
                  <button onClick={() => deleteAllergyHandler(allergy.id)} disabled={isPending} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity mt-1 disabled:opacity-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }) : (
              <div className="text-center py-6">
                <ShieldAlert className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('allergies.empty')}</p>
                <Badge className="mt-2 bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]">{t('allergies.nkda')}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========== ROW 2: Medications ========== */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Pill className="w-4 h-4 text-purple-500" /> {t('sections.medications')}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setMedicationDialog(true)} className="h-7 w-7 p-0 rounded-lg hover:bg-purple-50">
            <Plus className="w-4 h-4 text-purple-500" />
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {medications.length > 0 ? medications.map((med) => (
              <div key={med.id} className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm flex items-start gap-3 group hover:border-purple-100 transition-colors dark:bg-slate-800/50 dark:border-slate-800 dark:hover:border-purple-800">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600 flex-shrink-0 dark:bg-purple-900/30 dark:text-purple-400">
                  <Pill className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{med.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{med.dosage}</p>
                  {med.frequency && <p className="text-[10px] text-muted-foreground mt-0.5">{med.frequency}</p>}
                  {med.prescribedFor && (
                    <Badge variant="outline" className="mt-1.5 text-[9px] px-1.5 py-0 border-purple-200 text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400">{med.prescribedFor}</Badge>
                  )}
                </div>
                <button onClick={() => deleteMedicationHandler(med.id)} disabled={isPending} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )) : (
              <div className="text-center py-6 col-span-full">
                <Pill className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('medications.empty')}</p>
                <Button size="sm" variant="link" onClick={() => setMedicationDialog(true)} className="text-purple-600 text-xs mt-1">{t('medications.addLink')}</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ========== ROW 3: Surgical History + Family History ========== */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Surgical History */}
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between dark:border-slate-800">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2 dark:text-white">
              <Syringe className="w-4 h-4 text-blue-500" /> {t('sections.surgicalHistory')}
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setSurgeryDialog(true)} className="h-7 w-7 p-0 rounded-lg hover:bg-blue-50">
              <Plus className="w-4 h-4 text-blue-600" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {surgeries.length > 0 ? surgeries.map(s => (
              <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 group hover:border-blue-100 transition-colors dark:bg-slate-800/50 dark:border-slate-800 dark:hover:border-blue-800">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 dark:bg-blue-900/30">
                  <Syringe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground"><Clock className="w-3 h-3 inline mr-1" />{s.date}</p>
                  {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
                </div>
                <button onClick={() => deleteSurgeryHandler(s.id)} disabled={isPending} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )) : (
              <div className="text-center py-6">
                <Syringe className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('surgical.empty')}</p>
                <Button size="sm" variant="link" onClick={() => setSurgeryDialog(true)} className="text-blue-600 text-xs mt-1">{t('surgical.addLink')}</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Family History */}
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between dark:border-slate-800">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2 dark:text-white">
              <Heart className="w-4 h-4 text-pink-500" /> {t('sections.familyHistory')}
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setFamilyDialog(true)} className="h-7 w-7 p-0 rounded-lg hover:bg-pink-50">
              <Plus className="w-4 h-4 text-pink-500" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {familyHistory.length > 0 ? familyHistory.map(fh => (
              <div key={fh.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 group hover:border-pink-100 transition-colors dark:bg-slate-800/50 dark:border-slate-800 dark:hover:border-pink-800">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{fh.condition}</p>
                  <p className="text-xs text-muted-foreground">{t('family.relation', { value: t(`family.relations.${fh.relation}`) })}</p>
                </div>
                <button onClick={() => deleteFamilyHandler(fh.id)} disabled={isPending} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )) : (
              <div className="text-center py-6">
                <Heart className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('family.empty')}</p>
                <Button size="sm" variant="link" onClick={() => setFamilyDialog(true)} className="text-pink-600 text-xs mt-1">{t('family.addLink')}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========== ROW 4: Lifestyle & Vitals ========== */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-slate-800">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-500" /> {t('sections.lifestyle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid sm:grid-cols-3 gap-4">
            {/* Blood Type */}
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/30 dark:bg-slate-800/50 dark:border-slate-800">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('lifestyle.bloodType')}</p>
              <div className="flex flex-wrap gap-1.5">
                {(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as BloodType[]).map(bt => (
                  <button
                    key={bt}
                    onClick={() => handleUpdateVitals('bloodType', bloodType === bt ? "" : bt)}
                    disabled={isPending}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                      bloodType === bt
                        ? "bg-red-500 text-white shadow-sm"
                        : "bg-white border border-gray-200 text-gray-600 hover:border-red-200 hover:bg-red-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-red-900/30 dark:hover:border-red-800"
                    }`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </div>

            {/* Smoking */}
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/30 dark:bg-slate-800/50 dark:border-slate-800">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Cigarette className="w-3 h-3" /> {t('lifestyle.smokingStatus')}
              </p>
              <div className="flex gap-1.5">
                {(["Never", "Former", "Current"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => handleUpdateVitals('smoking', s)}
                    disabled={isPending}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1 disabled:opacity-50 ${
                      smoking === s
                        ? s === "Current" ? "bg-red-500 text-white" : s === "Former" ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {t(`lifestyle.smoking.${s}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Alcohol */}
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/30 dark:bg-slate-800/50 dark:border-slate-800">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Wine className="w-3 h-3" /> {t('lifestyle.alcoholUse')}
              </p>
              <div className="flex gap-1.5">
                {(["None", "Social", "Regular"] as const).map(a => (
                  <button
                    key={a}
                    onClick={() => handleUpdateVitals('alcohol', a)}
                    disabled={isPending}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1 disabled:opacity-50 ${
                      alcohol === a
                        ? a === "Regular" ? "bg-red-500 text-white" : a === "Social" ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {t(`lifestyle.alcohol.${a}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== ROW 5: General Notes ========== */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2 dark:text-white">
            <FileText className="w-4 h-4 text-muted-foreground" /> {t('sections.generalNotes')}
          </CardTitle>
          <button onClick={() => editingNotes ? saveGeneralNotes() : setEditingNotes(true)} disabled={isPending} className="text-muted-foreground hover:text-blue-600 transition-colors disabled:opacity-50">
            {editingNotes ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Edit2 className="w-4 h-4" />}
          </button>
        </CardHeader>
        <CardContent className="pt-4">
          {editingNotes ? (
            <textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder={t('notes.placeholder')}
              className="w-full min-h-[120px] p-4 rounded-xl border border-blue-200 bg-blue-50/30 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              autoFocus
            />
          ) : (
            <div onClick={() => setEditingNotes(true)} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 text-sm text-muted-foreground min-h-[80px] cursor-pointer hover:bg-gray-100/50 transition-colors whitespace-pre-wrap dark:bg-slate-800/50 dark:border-slate-800 dark:hover:bg-slate-800">
              {generalNotes || t('notes.clickToAdd')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==================== DIALOGS ==================== */}

      {/* Add Condition */}
      <Dialog open={conditionDialog} onOpenChange={setConditionDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 m-0">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-blue-600" /> {t('dialogs.addCondition.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addCondition.conditionName')}</label>
              <input
                type="text"
                value={newCondition.name}
                onChange={(e) => setNewCondition(p => ({ ...p, name: e.target.value }))}
                placeholder={t('dialogs.addCondition.phCondition')}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {COMMON_CONDITIONS.filter(c => !conditions.find(x => x.name === c)).slice(0, 8).map(c => (
                  <button key={c} onClick={() => setNewCondition(p => ({ ...p, name: c }))} className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-muted-foreground hover:bg-blue-100 hover:text-blue-700 transition-colors dark:bg-slate-800 dark:hover:bg-slate-700">{c}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addCondition.yearDiagnosed')}</label>
                <input type="text" value={newCondition.diagnosed} onChange={(e) => setNewCondition(p => ({ ...p, diagnosed: e.target.value }))} placeholder={t('dialogs.addCondition.phYear')} className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addCondition.status')}</label>
                <select value={newCondition.status} onChange={(e) => setNewCondition(p => ({ ...p, status: e.target.value as ConditionStatus }))} className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300">
                  {(["Active", "Controlled", "Managed", "Monitoring", "Resolved"] as ConditionStatus[]).map(s => (
                    <option key={s} value={s}>{t(`conditions.status.${s}`)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addCondition.notes')}</label>
              <textarea value={newCondition.notes} onChange={(e) => setNewCondition(p => ({ ...p, notes: e.target.value }))} placeholder={t('dialogs.addCondition.phNotes')} className="w-full h-16 rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
            <Button onClick={addConditionHandler} disabled={!newCondition.name.trim() || isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-sm font-semibold shadow-md shadow-blue-500/20">
              <Save className="w-4 h-4 mr-2" /> {t('dialogs.addCondition.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Allergy */}
      <Dialog open={allergyDialog} onOpenChange={setAllergyDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
          <DialogHeader className="px-6 py-4 border-b border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 m-0">
            <DialogTitle className="text-lg font-bold text-red-800 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" /> {t('dialogs.addAllergy.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addAllergy.allergen')}</label>
              <input type="text" value={newAllergy.name} onChange={(e) => setNewAllergy(p => ({ ...p, name: e.target.value }))} placeholder={t('dialogs.addAllergy.phAllergen')} className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300" />
              <div className="flex flex-wrap gap-1 mt-1">
                {COMMON_ALLERGIES.filter(a => !allergies.find(x => x.name === a)).slice(0, 8).map(a => (
                  <button key={a} onClick={() => setNewAllergy(p => ({ ...p, name: a }))} className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-muted-foreground hover:bg-red-100 hover:text-red-700 transition-colors dark:bg-slate-800 dark:hover:bg-slate-700">{a}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addAllergy.severity')}</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Mild", "Moderate", "Severe"] as AllergySeverity[]).map(s => (
                  <button key={s} onClick={() => setNewAllergy(p => ({ ...p, severity: s }))} className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    newAllergy.severity === s
                      ? s === "Severe" ? "bg-red-50 border-red-400 text-red-700" : s === "Moderate" ? "bg-amber-50 border-amber-400 text-amber-700" : "bg-emerald-50 border-emerald-400 text-emerald-700"
                      : "bg-white border-gray-200 text-muted-foreground hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                  }`}>{SEVERITY_CONFIGS[s].icon} {t(`allergies.severity.${s}`)}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addAllergy.reactionType')}</label>
              <input type="text" value={newAllergy.reaction} onChange={(e) => setNewAllergy(p => ({ ...p, reaction: e.target.value }))} placeholder={t('dialogs.addAllergy.phReaction')} className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300" />
            </div>
            <Button onClick={addAllergyHandler} disabled={!newAllergy.name.trim() || isPending} className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl h-10 text-sm font-semibold shadow-md shadow-red-500/20">
              <Save className="w-4 h-4 mr-2" /> {t('dialogs.addAllergy.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Medication */}
      <Dialog open={medicationDialog} onOpenChange={setMedicationDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
          <DialogHeader className="px-6 py-4 border-b border-purple-100 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-900/20 m-0">
            <DialogTitle className="text-lg font-bold text-purple-800 dark:text-purple-400 flex items-center gap-2">
              <Pill className="w-5 h-5 text-purple-600" /> {t('dialogs.addMedication.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addMedication.medicationName')}</label>
              <input type="text" value={newMedication.name} onChange={(e) => setNewMedication(p => ({ ...p, name: e.target.value }))} placeholder={t('dialogs.addMedication.phMed')} className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addMedication.dosage')}</label>
                <input type="text" value={newMedication.dosage} onChange={(e) => setNewMedication(p => ({ ...p, dosage: e.target.value }))} placeholder={t('dialogs.addMedication.phDosage')} className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addMedication.frequency')}</label>
                <input type="text" value={newMedication.frequency} onChange={(e) => setNewMedication(p => ({ ...p, frequency: e.target.value }))} placeholder={t('dialogs.addMedication.phFrequency')} className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addMedication.prescribedFor')}</label>
              <input type="text" value={newMedication.prescribedFor} onChange={(e) => setNewMedication(p => ({ ...p, prescribedFor: e.target.value }))} placeholder={t('dialogs.addMedication.phFor')} className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300" />
            </div>
            <Button onClick={addMedicationHandler} disabled={!newMedication.name.trim() || isPending} className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-10 text-sm font-semibold shadow-md shadow-purple-500/20">
              <Save className="w-4 h-4 mr-2" /> {t('dialogs.addMedication.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Surgery */}
      <Dialog open={surgeryDialog} onOpenChange={setSurgeryDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 m-0">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Syringe className="w-5 h-5 text-blue-600" /> {t('dialogs.addSurgery.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addSurgery.procedure')}</label>
              <input type="text" value={newSurgery.name} onChange={(e) => setNewSurgery(p => ({ ...p, name: e.target.value }))} placeholder={t('dialogs.addSurgery.phProcedure')} className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addSurgery.date')}</label>
              <input type="text" value={newSurgery.date} onChange={(e) => setNewSurgery(p => ({ ...p, date: e.target.value }))} placeholder={t('dialogs.addSurgery.phDate')} className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addSurgery.notes')}</label>
              <textarea value={newSurgery.notes} onChange={(e) => setNewSurgery(p => ({ ...p, notes: e.target.value }))} placeholder={t('dialogs.addSurgery.phNotes')} className="w-full h-16 rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
            <Button onClick={addSurgeryHandler} disabled={!newSurgery.name.trim() || isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-sm font-semibold shadow-md shadow-blue-500/20">
              <Save className="w-4 h-4 mr-2" /> {t('dialogs.addSurgery.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Family History */}
      <Dialog open={familyDialog} onOpenChange={setFamilyDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
          <DialogHeader className="px-6 py-4 border-b border-pink-100 dark:border-pink-900/50 bg-pink-50 dark:bg-pink-900/20 m-0">
            <DialogTitle className="text-lg font-bold text-pink-800 dark:text-pink-400 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-600" /> {t('dialogs.addFamily.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addFamily.condition')}</label>
              <input type="text" value={newFamily.condition} onChange={(e) => setNewFamily(p => ({ ...p, condition: e.target.value }))} placeholder={t('dialogs.addFamily.phCondition')} className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-300" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dialogs.addFamily.relation')}</label>
              <div className="flex flex-wrap gap-1.5">
                {["Father", "Mother", "Brother", "Sister", "Grandfather", "Grandmother"].map(r => (
                  <button key={r} onClick={() => setNewFamily(p => ({ ...p, relation: r }))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${newFamily.relation === r ? "bg-pink-600 text-white border-pink-600" : "bg-white border-gray-200 text-muted-foreground hover:bg-pink-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"}`}>{t(`family.relations.${r}`)}</button>
                ))}
              </div>
            </div>
            <Button onClick={addFamilyHandler} disabled={!newFamily.condition.trim() || isPending} className="w-full bg-pink-600 hover:bg-pink-700 text-white rounded-xl h-10 text-sm font-semibold shadow-md shadow-pink-500/20">
              <Save className="w-4 h-4 mr-2" /> {t('dialogs.addFamily.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
