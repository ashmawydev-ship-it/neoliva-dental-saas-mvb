"use client";

import { useState, useTransition, useEffect, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  RefreshCw, 
  Stethoscope, 
  Image as ImageIcon, 
  PenTool, 
  Trash2, 
  FileText, 
  Camera, 
  AlertTriangle, 
  Edit3, 
  Check,
  Save,
  Plus,
  Info as InfoIcon
} from "lucide-react";
import { 
  updateToothCondition, 
  uploadToothPhoto, 
  deleteToothPhoto, 
  updatePatientNotes 
} from "@/app/actions/patients";

import { 
  ToothCondition as ToothCondType, 
  ToothType, 
  SurfaceColor, 
  SurfaceKey, 
  ToothSurfaces, 
  ClinicalFinding, 
  ToothPhoto, 
  ToothMeta,
  emptySurfaces,
  defaultMeta,
  parseToothMeta,
  TOOTH_CONDITIONS,
  SURFACE_COLORS,
  SURFACE_LABELS,
  DentalGrid,
  ToothVisual,
  ToothCell,
  SurfacesPopover
} from "@/components/shared/dental";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function ToothChart({ patient, onRefresh }: { patient: any; onRefresh?: () => void }) {
  const t = useTranslations('toothChart');
  const [isPending, startTransition] = useTransition();
  const [isUpdating, setIsUpdating] = useState(false);
  const isUpdatingRef = useRef(false);

  const conditionLabels = useMemo(() => ({
    healthy: t('conditions.healthy'),
    caries: t('conditions.caries'),
    filled: t('conditions.filled'),
    crown: t('conditions.crown'),
    extracted: t('conditions.extracted'),
  }), [t]);

  const tooltipLabels = useMemo(() => ({
    healthy: t('tooltips.healthy'),
    caries: t('tooltips.caries'),
    filled: t('tooltips.filled'),
    crown: t('tooltips.crown'),
    extracted: t('tooltips.extracted'),
  }), [t]);

  // Core Chart State
  const [toothConditions, setToothConditions] = useState<Record<number, ToothCondType>>({});
  const [missingTeeth, setMissingTeeth] = useState<Record<number, boolean>>({});
  const [toothMeta, setToothMeta] = useState<Record<number, ToothMeta>>({});
  const [photos, setPhotos] = useState<ToothPhoto[]>([]);
  
  // Note State
  const [chartNote, setChartNote] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isSavingNote, startNoteSave] = useTransition();

  // Dialog States
  const [findingsDialog, setFindingsDialog] = useState<number | null>(null);
  const [photosDialog, setPhotosDialog] = useState<number | null>(null);
  const [extractionDialog, setExtractionDialog] = useState<number | null>(null);
  const [colorCodeDialog, setColorCodeDialog] = useState(false);

  // Finding/Parameter form state
  const [findingType, setFindingType] = useState<"finding" | "parameter">("finding");
  const [newFinding, setNewFinding] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // 1. Initialize State from Patient Data
  useEffect(() => {
    if (!patient || isUpdatingRef.current) return;

    // Map Tooth Conditions
    const conditions: Record<number, ToothCondType> = {};
    const missing: Record<number, boolean> = {};
    const meta: Record<number, ToothMeta> = {};
    
    (patient.toothConditions || []).forEach((c: any) => {
      // FIX BUG #1: Use toothNumber (camelCase) instead of tooth_number (snake_case from DB)
      const tNum = c.toothNumber; 
      if (tNum) {
        conditions[tNum] = c.condition as ToothCondType;
        missing[tNum] = c.isMissing || false;
        meta[tNum] = parseToothMeta(c.notes);
      }
    });

    setToothConditions(conditions);
    setMissingTeeth(missing);
    setToothMeta(meta);
    setChartNote(patient.notes || "");

    // Map Photos (PatientDocuments with specific type)
    const toothPhotos: ToothPhoto[] = (patient.patient_documents || [])
      .filter((doc: any) => doc.type?.startsWith("TOOTH_PHOTO_"))
      .map((doc: any) => {
        const tooth = parseInt(doc.type.split("_").pop() || "0");
        return {
          id: doc.id,
          tooth,
          url: doc.fileUrl,
          name: doc.name,
          date: new Date(doc.uploadDate || doc.createdAt).toLocaleDateString(),
          size: "Live"
        };
      });
    setPhotos(toothPhotos);
  }, [patient]);

  // 2. Persistence Handlers
  const currentCondition = (tooth: number) => toothConditions[tooth] || "healthy";
  const currentIsMissing = (tooth: number) => missingTeeth[tooth] || false;
  const currentMeta = (tooth: number) => toothMeta[tooth] || defaultMeta();

  const persistChange = async (tooth: number, condition: ToothCondType, isMissing: boolean, meta: ToothMeta) => {
    isUpdatingRef.current = true;
    setIsUpdating(true);
    
    try {
      const result = await updateToothCondition(
        patient.id, 
        tooth, 
        condition, 
        isMissing,
        JSON.stringify(meta)
      );
      
      if (result.success) {
        onRefresh?.();
      }
    } finally {
      setIsUpdating(false);
      isUpdatingRef.current = false;
    }
  };

  const handleConditionChange = (tooth: number, cond: ToothCondType) => {
    const prevCond = currentCondition(tooth);
    if (prevCond === cond) return;

    setToothConditions(prev => ({ ...prev, [tooth]: cond }));
    persistChange(tooth, cond, currentIsMissing(tooth), currentMeta(tooth));
  };

  const handleToggleMissing = (tooth: number) => {
    const newVal = !currentIsMissing(tooth);
    setMissingTeeth(prev => ({ ...prev, [tooth]: newVal }));
    persistChange(tooth, currentCondition(tooth), newVal, currentMeta(tooth));
  };

  const handleToggleToothType = (tooth: number) => {
    const meta = currentMeta(tooth);
    const newType: ToothType = meta.toothType === 'permanent' ? 'primary' : 'permanent';
    const newMeta = { ...meta, toothType: newType };
    
    setToothMeta(prev => ({ ...prev, [tooth]: newMeta }));
    persistChange(tooth, currentCondition(tooth), currentIsMissing(tooth), newMeta);
  };

  const handleSurfaceChange = (tooth: number, surface: SurfaceKey, color: SurfaceColor) => {
    const meta = currentMeta(tooth);
    const newMeta = {
      ...meta,
      surfaces: { ...meta.surfaces, [surface]: color }
    };
    
    setToothMeta(prev => ({ ...prev, [tooth]: newMeta }));
    persistChange(tooth, currentCondition(tooth), currentIsMissing(tooth), newMeta);
  };

  const handleAddFinding = (tooth: number) => {
    if (!newFinding.trim()) return;
    
    const meta = currentMeta(tooth);
    const finding: ClinicalFinding = {
      id: crypto.randomUUID(),
      tooth: tooth.toString(),
      type: findingType,
      note: newFinding.trim(),
      date: new Date().toLocaleDateString()
    };
    
    const newMeta = {
      ...meta,
      findings: [finding, ...meta.findings]
    };
    
    setToothMeta(prev => ({ ...prev, [tooth]: newMeta }));
    setNewFinding("");
    persistChange(tooth, currentCondition(tooth), currentIsMissing(tooth), newMeta);
  };

  const handleDeleteFinding = (tooth: number, id: string) => {
    const meta = currentMeta(tooth);
    const newMeta = {
      ...meta,
      findings: meta.findings.filter(f => f.id !== id)
    };
    
    setToothMeta(prev => ({ ...prev, [tooth]: newMeta }));
    persistChange(tooth, currentCondition(tooth), currentIsMissing(tooth), newMeta);
  };

  const handleExtraction = (tooth: number) => {
    handleToggleMissing(tooth);
    setExtractionDialog(null);
  };

  const handleAddPhoto = async (tooth: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setPhotoUploading(true);
      setPhotoError(null);
      
      const formData = new FormData();
      formData.append('file', file);

      const res = await uploadToothPhoto(patient.id, tooth, formData);
      setPhotoUploading(false);
      
      if (res.success) {
        onRefresh?.();
      } else {
        setPhotoError(res.error || "Failed to upload photo");
      }
    };
    input.click();
  };

  const handleDeletePhoto = async (id: string, url: string) => {
    const res = await deleteToothPhoto(patient.id, id, url);
    if (res.success) {
      onRefresh?.();
    }
  };

  const renderTooth = (tooth: number, isTop: boolean) => {
    const cond = currentCondition(tooth);
    const isMissing = currentIsMissing(tooth);
    const meta = currentMeta(tooth);
    const type = meta.toothType;
    const surfaces = meta.surfaces;

    const getFillAndStroke = (c: ToothCondType) => {
      switch (c) {
        case "healthy": return { fill: "#ffffff", stroke: "#94a3b8" };
        case "caries": return { fill: "#ef4444", stroke: "#b91c1c" };
        case "filled": return { fill: "#3b82f6", stroke: "#1d4ed8" };
        case "extracted": return { fill: "#f1f5f9", stroke: "#cbd5e1" }; 
        case "crown": return { fill: "#facc15", stroke: "#ca8a04" };
        default: return { fill: "#ffffff", stroke: "#94a3b8" };
      }
    };

    const { fill, stroke } = getFillAndStroke(cond);

    return (
      <ToothCell
        key={tooth}
        toothId={tooth}
        isTop={isTop}
        toothType={type}
        fill={fill}
        stroke={stroke}
        isExtracted={isMissing}
        extraContent={
          <SurfacesPopover 
            tooth={tooth} 
            surfaces={surfaces} 
            onSurfaceChange={handleSurfaceChange} 
          />
        }
      >
        <Popover>
          <PopoverTrigger asChild>
            <button className="cursor-pointer group flex items-center justify-center focus:outline-none bg-transparent border-0 p-1 w-full hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors relative">
              <ToothVisual
                toothId={tooth}
                isTop={isTop}
                toothType={type}
                fill={fill}
                stroke={stroke}
                isExtracted={isMissing}
                className="group-hover:scale-110 drop-shadow-sm group-hover:drop-shadow-md mx-auto"
              />
              {isUpdating && <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-slate-900/40 rounded-xl"><RefreshCw className="w-4 h-4 animate-spin text-blue-500" /></div>}
            </button>
          </PopoverTrigger>

          <PopoverContent className="w-80 p-4 rounded-2xl shadow-xl border-gray-100 dark:border-slate-800 dark:bg-slate-900 flex flex-col gap-4">
            <div className="text-center pb-3 border-b border-gray-100 dark:border-slate-800">
               <p className="text-lg font-bold text-foreground dark:text-white">Tooth #{tooth}</p>
               <p className="text-xs text-muted-foreground mt-0.5">{t('toothDialog.selectCondition')}</p>
               {type === "primary" && (
                 <Badge className="mt-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 text-[10px]">{t('primaryDeciduous')}</Badge>
               )}
            </div>
            
            <div className="flex justify-between items-center bg-gray-50/80 dark:bg-slate-800/80 p-2 rounded-xl border border-gray-100 dark:border-slate-800">
              {Object.entries(TOOTH_CONDITIONS).map(([key, val]) => (
                <button
                  key={key}
                  title={val.tooltip}
                  onClick={() => handleConditionChange(tooth, key as ToothCondType)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg transition-all",
                    key === cond ? 'bg-white dark:bg-slate-700 shadow-sm ring-1 ring-gray-200 dark:ring-slate-600' : 'hover:bg-gray-100/50 dark:hover:bg-slate-700/50'
                  )}
                >
                  <div className={cn("w-4 h-4 rounded-full border", val.color)} />
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
               <Button 
                  variant="outline" 
                  onClick={() => handleToggleMissing(tooth)}
                  className={cn(
                    "h-auto py-2.5 flex items-center justify-center gap-2 text-xs font-semibold rounded-xl border-gray-200 dark:border-slate-700 transition-all",
                    isMissing ? "bg-gray-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-gray-900 dark:hover:bg-white border-gray-900 dark:border-slate-100" : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  )}
               >
                  <span className={cn("text-lg font-black leading-none mb-0.5", isMissing ? "text-white dark:text-slate-900" : "text-gray-400 dark:text-slate-500")}>X</span> 
                  {isMissing ? t('toothDialog.unmarkMissing') : t('toothDialog.markMissing')}
               </Button>
              <Button 
                 variant="outline" 
                 onClick={() => setExtractionDialog(tooth)}
                 className="h-auto py-2.5 flex items-center justify-center gap-2 text-xs font-semibold rounded-xl text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                 <span className="text-red-500 text-lg font-black leading-none mb-0.5">!</span> {t('extractionDialog.title')}
              </Button>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button 
                variant="secondary" 
                onClick={() => handleToggleToothType(tooth)}
                className="w-full justify-start text-xs rounded-xl bg-gray-100/80 dark:bg-slate-800/80 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 h-10 border-0"
              >
                <RefreshCw className="w-4 h-4 mr-2.5 text-gray-500" /> 
                {t('toothDialog.switchTo')} {type === "permanent" ? t('primaryDeciduous') : t('toothDialog.permanent')}
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setFindingsDialog(tooth)}
                className="w-full justify-start text-xs rounded-xl bg-gray-100/80 dark:bg-slate-800/80 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 h-10 border-0"
              >
                <Stethoscope className="w-4 h-4 mr-2.5 text-muted-foreground" /> {t('findingsDialog.title')}
                {(meta.findings?.length ?? 0) > 0 && (
                  <Badge className="ml-auto bg-blue-100 text-blue-700 text-[10px] px-1.5">{meta.findings.length}</Badge>
                )}
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setPhotosDialog(tooth)}
                className="w-full justify-start text-xs rounded-xl bg-gray-100/80 dark:bg-slate-800/80 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 h-10 border-0"
              >
                <ImageIcon className="w-4 h-4 mr-2.5 text-muted-foreground" /> {t('photosDialog.title')}
                {photos.filter(p => p.tooth === tooth).length > 0 && (
                  <Badge className="ml-auto bg-emerald-100 text-emerald-700 text-[10px] px-1.5">{photos.filter(p => p.tooth === tooth).length}</Badge>
                )}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </ToothCell>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground dark:text-white">{t('title')}</h3>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm cursor-help" onClick={() => setColorCodeDialog(true)}>
          {Object.entries(TOOTH_CONDITIONS).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full border ${val.color}`} />
              <span className="text-[10px] uppercase font-bold text-gray-600 dark:text-slate-400 tracking-wider">
                {conditionLabels[key as keyof typeof conditionLabels]}
              </span>
            </div>
          ))}
          <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1" />
          <InfoIcon className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
        <CardContent className="p-8 relative">
          {isUpdating && (
            <div className="absolute inset-0 z-10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center">
              <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-lg border border-gray-100 dark:border-slate-700 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-xs font-bold text-gray-600 dark:text-slate-300">{t('chartNote.updating')}</span>
              </div>
            </div>
          )}
          <div className="overflow-x-auto scrollbar-thin">
            <div className="min-w-[700px]">
              <DentalGrid renderTooth={renderTooth} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Doctor's Chart Note */}
      <div className="mt-6 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" /> {t('chartNote.title')}
          </h3>
          {!isEditingNote ? (
            <button
              onClick={() => setIsEditingNote(true)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <Edit3 className="w-3.5 h-3.5" /> {t('chartNote.edit')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setChartNote(patient?.notes || ''); setIsEditingNote(false); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {t('chartNote.cancel')}
              </button>
              <button
                onClick={() => {
                  startNoteSave(async () => {
                    await updatePatientNotes(patient.id, chartNote);
                    setIsEditingNote(false);
                    onRefresh?.();
                  });
                }}
                disabled={isSavingNote}
                className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingNote ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} {t('chartNote.save')}
              </button>
            </div>
          )}
        </div>
        {isEditingNote ? (
          <textarea
            value={chartNote}
            onChange={e => setChartNote(e.target.value)}
            placeholder="Add clinical notes about this patient's dental chart…"
            className="w-full h-28 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:text-slate-300"
          />
        ) : (
          <p className="text-sm text-gray-600 dark:text-slate-400 min-h-[2.5rem] whitespace-pre-wrap leading-relaxed">
            {chartNote || <span className="text-gray-400 dark:text-slate-500 italic">{t('chartNote.empty')}</span>}
          </p>
        )}
      </div>

      {/* ==================== DIALOGS ==================== */}

      {/* Clinical Findings Dialog */}
      <Dialog open={findingsDialog !== null} onOpenChange={(open) => !open && setFindingsDialog(null)}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 m-0">
            <DialogTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" /> {t('findingsDialog.dialogTitle', { tooth: findingsDialog ?? '' })}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setFindingType("finding")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    findingType === "finding" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  )}
                >
                  {t('findingsDialog.finding')}
                </button>
                <button
                  onClick={() => setFindingType("parameter")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    findingType === "parameter" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  )}
                >
                  {t('findingsDialog.parameter')}
                </button>
              </div>
              <textarea
                value={newFinding}
                onChange={(e) => setNewFinding(e.target.value)}
                placeholder={t('findingsDialog.placeholder')}
                className="w-full h-20 rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
              <Button 
                onClick={() => findingsDialog && handleAddFinding(findingsDialog)}
                disabled={!newFinding.trim() || isUpdating}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-sm font-semibold w-full shadow-md shadow-blue-500/20"
              >
                {isUpdating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} 
                {t('findingsDialog.addToChart')}
              </Button>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('toothDialog.previousFindings')}</p>
              {findingsDialog !== null && (currentMeta(findingsDialog).findings ?? []).length > 0 ? (
                currentMeta(findingsDialog!).findings.map(f => (
                  <div key={f.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 flex gap-3 group dark:bg-slate-800/50 dark:border-slate-800">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      f.type === 'finding' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                    )}>
                      {f.type === 'finding' ? <FileText className="w-4 h-4" /> : <Stethoscope className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-slate-300">{f.note}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{f.date} · {f.type === 'finding' ? t('findingsDialog.finding') : t('findingsDialog.parameter')}</p>
                    </div>
                    <button
                      onClick={() => findingsDialog !== null && handleDeleteFinding(findingsDialog, f.id)}
                      disabled={isUpdating}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">{t('toothDialog.noFindings')}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photos Dialog */}
      <Dialog open={photosDialog !== null} onOpenChange={(open) => !open && setPhotosDialog(null)}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 m-0">
            <DialogTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600" /> {t('photosDialog.dialogTitle', { tooth: photosDialog ?? '' })}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <Button
              onClick={() => photosDialog !== null && handleAddPhoto(photosDialog)}
              disabled={photoUploading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 text-sm font-semibold w-full shadow-md shadow-emerald-500/20"
            >
              {photoUploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
              {photoUploading ? t('photosDialog.uploading') : t('photosDialog.upload')}
            </Button>
            {photoError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{photoError}</p>
            )}
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('toothDialog.attachedPhotos')}</p>
              {photos.filter(p => p.tooth === photosDialog).length > 0 ? (
                photos.filter(p => p.tooth === photosDialog).map(p => (
                  <div key={p.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center gap-3 group dark:bg-slate-800/50 dark:border-slate-800">
                    <a href={p.url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">
                      <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </a>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-slate-300 truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-400">{p.date}</p>
                    </div>
                    <button
                      onClick={() => handleDeletePhoto(p.id, p.url)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">{t('toothDialog.noPhotos')}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extraction Confirmation Dialog */}
      <Dialog open={extractionDialog !== null} onOpenChange={(open) => !open && setExtractionDialog(null)}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
          <DialogHeader className="px-6 py-4 border-b border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 m-0">
            <DialogTitle className="text-lg font-bold text-red-800 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" /> {t('extractionDialog.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <p className="text-sm text-gray-700 dark:text-slate-300">
              {t('extractionDialog.body', { tooth: extractionDialog ?? '' })}
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setExtractionDialog(null)} 
                className="flex-1 rounded-xl border-gray-200 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
              >
                {t('extractionDialog.cancel')}
              </Button>
              <Button 
                onClick={() => extractionDialog && handleExtraction(extractionDialog)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md"
              >
                {t('extractionDialog.confirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Color Code Interpretation Dialog */}
      <Dialog open={colorCodeDialog} onOpenChange={setColorCodeDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 m-0">
            <DialogTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <PenTool className="w-5 h-5 text-blue-600" /> {t('conditionKey')}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-3">
            {Object.entries(TOOTH_CONDITIONS).map(([key, val]) => (
              <div key={key} className="flex items-center gap-4 p-2.5 rounded-xl border border-gray-100 bg-gray-50/30 dark:bg-slate-800/50 dark:border-slate-800">
                <div className={cn("w-8 h-8 rounded-lg shadow-sm border border-black/10 flex-shrink-0", val.color)} />
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-300">{conditionLabels[key as keyof typeof conditionLabels]}</p>
                  <p className="text-xs text-muted-foreground">{tooltipLabels[key as keyof typeof tooltipLabels]}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
