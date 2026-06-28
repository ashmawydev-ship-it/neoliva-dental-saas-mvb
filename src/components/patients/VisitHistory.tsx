"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Stethoscope, Plus, Trash2, Save, Search, Filter, Calendar, Clock,
  User, FileText, ChevronDown, ChevronUp, Eye, Printer, Hash, X, SlidersHorizontal
} from "lucide-react";
import { addVisitRecord, deleteVisitRecord } from "@/app/actions/patients";

// ============ TYPES ============
interface Visit {
  id: string;
  date: string;
  treatment: string;
  doctor: string;
  notes: string;
  tooth: string;
  category: VisitCategory;
  duration: string;
  cost: string;
  attachments: string[];
}

type VisitCategory = "Examination" | "Restorative" | "Endodontic" | "Surgical" | "Preventive" | "Orthodontic" | "Cosmetic" | "Other";

interface VisitInput {
  date: string;
  treatment: string;
  doctor: string;
  notes: string;
  tooth: string;
}

// ============ CONFIG ============
const CATEGORY_COLORS: Record<VisitCategory, { bg: string; text: string; border: string }> = {
  Examination:  { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  Restorative:  { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  Endodontic:   { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200" },
  Surgical:     { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200" },
  Preventive:   { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Orthodontic:  { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200" },
  Cosmetic:     { bg: "bg-pink-50",    text: "text-pink-700",    border: "border-pink-200" },
  Other:        { bg: "bg-gray-50",    text: "text-gray-700",    border: "border-gray-200" },
};

const DOCTORS = ["Dr. Smith", "Dr. Adams", "Dr. Lee", "Dr. Wilson", "Dr. Garcia"];

function categorizeVisit(treatment: string): VisitCategory {
  const t = treatment.toLowerCase();
  if (t.includes("x-ray") || t.includes("examination") || t.includes("exam") || t.includes("check")) return "Examination";
  if (t.includes("root canal") || t.includes("rct")) return "Endodontic";
  if (t.includes("extraction") || t.includes("implant") || t.includes("surgical")) return "Surgical";
  if (t.includes("cleaning") || t.includes("polishing") || t.includes("prophylaxis") || t.includes("gum")) return "Preventive";
  if (t.includes("filling") || t.includes("crown") || t.includes("bridge") || t.includes("restor")) return "Restorative";
  if (t.includes("orthodon") || t.includes("braces") || t.includes("wire")) return "Orthodontic";
  if (t.includes("whitening") || t.includes("veneer") || t.includes("cosmetic")) return "Cosmetic";
  return "Other";
}

export function VisitHistory({ visits: initialVisits, patientId }: { visits: VisitInput[]; patientId: string }) {
  const t = useTranslations('visitHistory');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const getTreatmentPresets = (): { name: string; category: VisitCategory }[] => [
    { name: t('presets.routineCleaning'), category: "Preventive" },
    { name: t('presets.dentalExam'), category: "Examination" },
    { name: t('presets.panoramicXray'), category: "Examination" },
    { name: t('presets.compositeFilling'), category: "Restorative" },
    { name: t('presets.rootCanal'), category: "Endodontic" },
    { name: t('presets.crownPrep'), category: "Restorative" },
    { name: t('presets.extraction'), category: "Surgical" },
    { name: t('presets.wisdomExtraction'), category: "Surgical" },
    { name: t('presets.whitening'), category: "Cosmetic" },
    { name: t('presets.orthodonticAdj'), category: "Orthodontic" },
    { name: t('presets.implant'), category: "Surgical" },
    { name: t('presets.veneer'), category: "Cosmetic" },
    { name: t('presets.gumTreatment'), category: "Preventive" },
    { name: t('presets.bridge'), category: "Restorative" },
  ];

  const mapVisit = (v: any, i: number): Visit => ({
    id: v.id ?? `v-${i}`,
    date: v.date ?? "",
    treatment: v.treatment ?? "",
    doctor: v.doctor ?? "",
    notes: v.notes ?? "",
    tooth: v.tooth ?? "",
    category: categorizeVisit(v.treatment ?? ""),
    duration: "45 min",
    cost: "",
    attachments: [],
  });

  const [visits, setVisits] = useState<Visit[]>(
    (initialVisits ?? []).map(mapVisit)
  );

  useEffect(() => {
    setVisits((initialVisits ?? []).map(mapVisit));
  }, [initialVisits]);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<VisitCategory | "All">("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Dialog
  const [addDialog, setAddDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState<string | null>(null);

  // Form
  const [newVisit, setNewVisit] = useState({
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    treatment: "",
    doctor: DOCTORS[0],
    notes: "",
    tooth: "",
    category: "Other" as VisitCategory,
    duration: "",
    cost: "",
  });

  // ============ FILTERING & SORTING ============
  const filteredVisits = visits
    .filter(v => {
      const matchesSearch = !searchQuery || 
        v.treatment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.tooth.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "All" || v.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  // ============ STATS ============
  const totalVisits = visits.length;
  const categoryCounts = visits.reduce((acc, v) => {
    acc[v.category] = (acc[v.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const lastVisitDate = visits.length > 0 ? visits[0].date : "—";

  // ============ HANDLERS ============
  const addVisit = () => {
    if (!newVisit.treatment.trim()) return;
    // Optimistic update
    const optimisticId = `v-${Date.now()}`;
    const v: Visit = {
      id: optimisticId,
      date: newVisit.date,
      treatment: newVisit.treatment,
      doctor: newVisit.doctor,
      notes: newVisit.notes,
      tooth: newVisit.tooth || "—",
      category: newVisit.category,
      duration: newVisit.duration || "30 min",
      cost: newVisit.cost,
      attachments: [],
    };
    setVisits(prev => [v, ...prev]);
    setNewVisit({
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      treatment: "", doctor: DOCTORS[0], notes: "", tooth: "", category: "Other", duration: "", cost: "",
    });
    setAddDialog(false);

    // Persist to DB
    startTransition(async () => {
      const result = await addVisitRecord(patientId, {
        date: newVisit.date,
        treatment: newVisit.treatment,
        doctor: newVisit.doctor,
        notes: newVisit.notes,
        tooth: newVisit.tooth || "",
      });
      if (result.success) {
        router.refresh();
      } else {
        // Rollback optimistic update on failure
        setVisits(prev => prev.filter(v => v.id !== optimisticId));
        console.error("Failed to save visit:", result.error);
      }
    });
  };

  const deleteVisit = (id: string) => {
    // Optimistic update
    setVisits(prev => prev.filter(v => v.id !== id));

    // Persist to DB (only for real DB records, not optimistic temp ids)
    if (!id.startsWith("v-")) {
      startTransition(async () => {
        const result = await deleteVisitRecord(patientId, id);
        if (result.success) {
          router.refresh();
        } else {
          console.error("Failed to delete visit:", result.error);
          router.refresh(); // Re-sync from server
        }
      });
    }
  };

  const selectPreset = (preset: { name: string; category: VisitCategory }) => {
    setNewVisit(p => ({ ...p, treatment: preset.name, category: preset.category }));
  };

  const viewingVisit = viewDialog ? visits.find(v => v.id === viewDialog) : null;

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* ========== STATS ROW ========== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
          <p className="text-2xl font-black">{totalVisits}</p>
          <p className="text-[11px] opacity-80 mt-0.5">{t('totalVisits')}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{lastVisitDate}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t('lastVisit')}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <div className="flex flex-wrap gap-1">
            {Object.entries(categoryCounts).slice(0, 3).map(([cat, count]) => (
              <Badge key={cat} variant="outline" className={`text-[9px] px-1.5 py-0 ${CATEGORY_COLORS[cat as VisitCategory]?.bg} ${CATEGORY_COLORS[cat as VisitCategory]?.text} ${CATEGORY_COLORS[cat as VisitCategory]?.border} dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700`}>
                {t(`categories.${cat}`)}: {count}
              </Badge>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">{t('byCategory')}</p>
        </div>
        <Button 
          onClick={() => setAddDialog(true)} 
          className="h-full min-h-[72px] bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl shadow-lg shadow-emerald-500/20 font-bold flex flex-col items-center justify-center gap-1"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs">{t('newVisit')}</span>
        </Button>
      </div>

      {/* ========== SEARCH & FILTERS ========== */}
      <Card className="border-0 shadow-sm dark:bg-slate-900">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-gray-50/50 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                showFilters ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400" : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {t('filters')}
            </button>
            <button 
              onClick={() => setSortOrder(s => s === "newest" ? "oldest" : "newest")} 
              className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 flex items-center gap-1.5 hover:bg-gray-50 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {sortOrder === "newest" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              {sortOrder === "newest" ? t('newest') : t('oldest')}
            </button>
          </div>
          
          {/* Category filter chips */}
          {showFilters && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
              <button 
                onClick={() => setCategoryFilter("All")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  categoryFilter === "All" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >{t('all')} ({totalVisits})</button>
              {(Object.keys(CATEGORY_COLORS) as VisitCategory[]).map(cat => {
                const count = categoryCounts[cat] || 0;
                if (count === 0 && categoryFilter !== cat) return null;
                const c = CATEGORY_COLORS[cat];
                return (
                  <button 
                    key={cat}
                    onClick={() => setCategoryFilter(categoryFilter === cat ? "All" : cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      categoryFilter === cat ? `${c.bg} ${c.text} ${c.border} ring-2 ring-offset-1 ring-blue-300` : `bg-white ${c.text} ${c.border} hover:${c.bg}`
                    }`}
                  >{t(`categories.${cat}`)} ({count})</button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== TIMELINE ========== */}
      <Card className="border-0 shadow-sm dark:bg-slate-900">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" /> {t('timeline')}
            {searchQuery && <Badge variant="outline" className="text-[9px] ml-2">{filteredVisits.length} {t('results')}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {filteredVisits.length > 0 ? (
            <div className="relative pl-6 border-l-2 border-blue-100 space-y-6">
              {filteredVisits.map((visit, i) => {
                const catColor = CATEGORY_COLORS[visit.category];
                const isExpanded = expandedVisit === visit.id;
                return (
                  <div key={visit.id} className="relative group">
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[25px] w-4 h-4 rounded-full border-4 border-white shadow-sm ${
                      i === 0 ? "bg-gradient-to-br from-blue-500 to-indigo-600 ring-4 ring-blue-100" : "bg-gradient-to-br from-blue-400 to-indigo-500"
                    }`} />

                    <div 
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isExpanded ? "bg-white border-blue-200 shadow-md dark:bg-slate-800 dark:border-blue-800" : "bg-gray-50/50 border-gray-100 hover:bg-white hover:border-gray-200 hover:shadow-sm dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-slate-800"
                      }`}
                      onClick={() => setExpandedVisit(isExpanded ? null : visit.id)}
                    >
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{visit.treatment}</h3>
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 rounded-full ${catColor.bg} ${catColor.text} ${catColor.border} dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700`}>
                              {t(`categories.${visit.category}`)}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{visit.date}</span>
                            <span className="text-gray-300">·</span>
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{visit.doctor}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className="text-[10px] rounded-full flex items-center gap-1 dark:border-slate-700 dark:text-slate-300">
                            <Hash className="w-2.5 h-2.5" />{visit.tooth}
                          </Badge>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>

                      {/* Notes Preview */}
                      <p className={`text-sm text-gray-600 dark:text-gray-400 leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>
                        {visit.notes}
                      </p>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 space-y-3 animate-fade-in-up">
                          {visit.duration && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              <span>{t('visit.duration')}: <strong className="text-gray-700 dark:text-gray-300">{visit.duration}</strong></span>
                            </div>
                          )}
                          {visit.cost && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <FileText className="w-3.5 h-3.5 text-gray-400" />
                              <span>{t('visit.cost')}: <strong className="text-gray-700 dark:text-gray-300">{visit.cost}</strong></span>
                            </div>
                          )}
                          <div className="flex gap-2 pt-1">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={(e) => { e.stopPropagation(); setViewDialog(visit.id); }}
                              className="h-8 text-xs rounded-lg gap-1 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              <Eye className="w-3 h-3" /> {t('viewDetails')}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={(e) => { e.stopPropagation(); window.print(); }}
                              className="h-8 text-xs rounded-lg gap-1 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              <Printer className="w-3 h-3" /> {t('print')}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={(e) => { e.stopPropagation(); deleteVisit(visit.id); }}
                              className="h-8 text-xs rounded-lg gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 ml-auto"
                            >
                              <Trash2 className="w-3 h-3" /> {t('delete')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Stethoscope className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-400">
                {searchQuery ? t('noResults') : t('emptyHistory')}
              </p>
              {searchQuery && (
                <Button size="sm" variant="link" onClick={() => { setSearchQuery(""); setCategoryFilter("All"); }} className="text-blue-600 text-xs mt-1">{t('clearFilters')}</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==================== DIALOGS ==================== */}

      {/* Add Visit Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 m-0">
            <DialogTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" /> {t('dialog.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Treatment presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('quickSelect')}</label>
              <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto p-2 rounded-xl border border-gray-100 bg-gray-50/50">
                {getTreatmentPresets().map(p => (
                  <button
                    key={p.name}
                    onClick={() => selectPreset(p)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                      newVisit.treatment === p.name 
                        ? `${CATEGORY_COLORS[p.category].bg} ${CATEGORY_COLORS[p.category].text} ${CATEGORY_COLORS[p.category].border}`
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >{p.name}</button>
                ))}
              </div>
            </div>

            {/* Treatment Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('treatmentProcedure')}</label>
              <input
                type="text"
                value={newVisit.treatment}
                onChange={(e) => setNewVisit(p => ({ ...p, treatment: e.target.value, category: categorizeVisit(e.target.value) }))}
                placeholder="e.g., Root Canal Treatment"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dialog.date')}</label>
                <input
                  type="text"
                  value={newVisit.date}
                  onChange={(e) => setNewVisit(p => ({ ...p, date: e.target.value }))}
                  placeholder="Apr 12, 2026"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                />
              </div>
              {/* Doctor */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dialog.doctor')}</label>
                <select
                  value={newVisit.doctor}
                  onChange={(e) => setNewVisit(p => ({ ...p, doctor: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-white"
                >
                  {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Tooth */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dialog.toothNumber')}</label>
                <input type="text" value={newVisit.tooth} onChange={(e) => setNewVisit(p => ({ ...p, tooth: e.target.value }))} placeholder="#14, All..." className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300" />
              </div>
              {/* Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('visit.duration')}</label>
                <input type="text" value={newVisit.duration} onChange={(e) => setNewVisit(p => ({ ...p, duration: e.target.value }))} placeholder="45 min" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300" />
              </div>
              {/* Cost */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('visit.cost')}</label>
                <input type="text" value={newVisit.cost} onChange={(e) => setNewVisit(p => ({ ...p, cost: e.target.value }))} placeholder="$300" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300" />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('category')}</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CATEGORY_COLORS) as VisitCategory[]).map(cat => {
                  const c = CATEGORY_COLORS[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setNewVisit(p => ({ ...p, category: cat }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        newVisit.category === cat ? `${c.bg} ${c.text} ${c.border} ring-2 ring-offset-1 ring-blue-300` : `bg-white border-gray-200 text-gray-500 hover:bg-gray-50`
                      }`}
                    >{t(`categories.${cat}`)}</button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dialog.notes')}</label>
              <textarea
                value={newVisit.notes}
                onChange={(e) => setNewVisit(p => ({ ...p, notes: e.target.value }))}
                placeholder="Describe the procedure, findings, and recommendations..."
                className="w-full h-24 rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
              />
            </div>

            <Button 
              onClick={addVisit}
              disabled={!newVisit.treatment.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 text-sm font-semibold shadow-md shadow-blue-500/20"
            >
              <Save className="w-4 h-4 mr-2" /> {t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Visit Detail Dialog */}
      <Dialog open={viewDialog !== null} onOpenChange={(o) => !o && setViewDialog(null)}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
          {viewingVisit && (
            <>
              <DialogHeader className={`px-6 py-5 border-b m-0 ${CATEGORY_COLORS[viewingVisit.category].bg}`}>
                <DialogTitle className="text-lg font-bold text-gray-800">
                  {viewingVisit.treatment}
                </DialogTitle>
                <Badge variant="outline" className={`w-fit text-[10px] mt-1 ${CATEGORY_COLORS[viewingVisit.category].text} ${CATEGORY_COLORS[viewingVisit.category].border}`}>
                  {t(`categories.${viewingVisit.category}`)}
                </Badge>
              </DialogHeader>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">{t('dialog.date')}</p>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mt-1"><Calendar className="w-3.5 h-3.5 text-blue-500" />{viewingVisit.date}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">{t('dialog.doctor')}</p>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mt-1"><User className="w-3.5 h-3.5 text-blue-500" />{viewingVisit.doctor}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">{t('visit.tooth')}</p>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mt-1"><Hash className="w-3.5 h-3.5 text-blue-500" />{viewingVisit.tooth}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">{t('visit.duration')}</p>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mt-1"><Clock className="w-3.5 h-3.5 text-blue-500" />{viewingVisit.duration}</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                  <p className="text-[10px] text-blue-500 uppercase font-bold mb-2">{t('clinicalNotes')}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{viewingVisit.notes || t('noNotes')}</p>
                </div>

                <Button 
                  onClick={() => window.print()} 
                  variant="outline"
                  className="w-full rounded-xl h-10 text-sm font-semibold"
                >
                  <Printer className="w-4 h-4 mr-2" /> {t('print')}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
