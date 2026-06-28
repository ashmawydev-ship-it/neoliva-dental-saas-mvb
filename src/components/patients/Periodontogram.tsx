"use client";

import { useState, useTransition, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, RotateCw, CheckSquare, Square, Loader2 } from "lucide-react";
import { updatePeriodontalMeasurement, createPeriodontalSession, deletePeriodontalSession } from "@/app/actions/patients";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DentalGrid, 
  ToothCell, 
  ToothVisual,
  isMolar
} from "@/components/shared/dental";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const parameters = [
  "Suppuration", "Mobility", "Probing depth",
  "Clinical attach. level", "Gingival margin + probing depth", "Mucogingival junction",
  "Furcation", "Bleeding", "Gingival margin"
];

export function Periodontogram({ patient, onRefresh }: { patient: any; onRefresh?: () => void }) {
  const t = useTranslations('periodontics');
  const [isPending, startTransition] = useTransition();
  const [activeParam, setActiveParam] = useState("Mucogingival junction");

  const paramLabels = useMemo(() => ({
    "Suppuration": t('params.suppuration'),
    "Mobility": t('params.mobility'),
    "Probing depth": t('params.probingDepth'),
    "Clinical attach. level": t('params.clinicalAttach'),
    "Gingival margin + probing depth": t('params.gingivalMarginProbing'),
    "Mucogingival junction": t('params.mucogingivalJunction'),
    "Furcation": t('params.furcation'),
    "Bleeding": t('params.bleeding'),
    "Gingival margin": t('params.gingivalMargin'),
  }), [t]);
  const [showLingual, setShowLingual] = useState(true);
  const [showBuccal, setShowBuccal] = useState(true);
  const [openPopover, setOpenPopover] = useState<number | null>(null);
  const [isRotated, setIsRotated] = useState(false);
  const [measurementDates, setMeasurementDates] = useState<Record<string, string>>({});
  // Prevents useEffect from overwriting local state while a save is in-flight
  const isUpdatingRef = useRef(false);

  const sessions = patient?.periodontalSessions ?? [];
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessions[0]?.id ?? null);
  
  // Helper: parse measurements array -> mapping object (Prisma returns camelCase)
  const parseMeasurements = (measurements: any[]) => {
    const mapping: any = {};
    const dates: Record<string, string> = {};
    measurements.forEach((m: any) => {
      const tooth = m.toothNumber;
      const param = m.parameterName;
      if (!mapping[tooth]) mapping[tooth] = {};
      mapping[tooth][param] = {
        buccal: m.buccalValues || [0, 0, 0],
        lingual: m.lingualValues || [0, 0, 0],
        single: m.singleValue ?? undefined
      };
      const dateKey = `${tooth}-${param}`;
      if (m.measurementDate) {
        dates[dateKey] = new Date(m.measurementDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
      }
    });
    return { mapping, dates };
  };

  // Sync state when patient prop changes or selected session changes
  useEffect(() => {
    if (!patient) return;
    if (isUpdatingRef.current) {
      isUpdatingRef.current = false;
      return;
    }
    
    // Auto-select latest session if none selected and sessions exist
    if (!selectedSessionId && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
    
    const currentSession = sessions.find((s: any) => s.id === selectedSessionId) || sessions[0];
    const { mapping, dates } = parseMeasurements(currentSession?.measurements ?? []);
    setData(mapping);
    setMeasurementDates(dates);
  }, [patient, selectedSessionId, sessions]);
  
  const [data, setData] = useState<Record<number, Record<string, { buccal: number[], lingual: number[], single?: number }>>>(() => {
    const currentSession = sessions[0];
    const { mapping } = parseMeasurements(currentSession?.measurements ?? []);
    return mapping;
  });

  const getMeasurementDate = (tooth: number, param: string) => {
    return measurementDates[`${tooth}-${param}`] ?? new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  };

  const setParamValue = (tooth: number, param: string, side: "buccal" | "lingual", pos: number, value: number) => {
    setData(prev => {
       const next = {...prev};
       if(!next[tooth]) next[tooth] = {};
       if(!next[tooth][param]) next[tooth][param] = { buccal: [0,0,0], lingual: [0,0,0] };
       next[tooth][param][side][pos] = value;
       return next;
    });
  };

  const setSingleValue = (tooth: number, param: string, value: number) => {
    setData(prev => {
        const next = {...prev};
        if(!next[tooth]) next[tooth] = {};
        next[tooth][param] = { buccal: [0,0,0], lingual: [0,0,0], single: value };
        return next;
    });
  };

  const saveMeasurement = (tooth: number, param: string) => {
    const measurement = data[tooth]?.[param];
    if (!measurement || !selectedSessionId) return;

    isUpdatingRef.current = true;
    startTransition(async () => {
      await updatePeriodontalMeasurement(patient.id, selectedSessionId, {
        toothNumber: tooth,
        parameterName: param,
        buccalValues: measurement.buccal,
        lingualValues: measurement.lingual,
        singleValue: measurement.single ?? null,
        date: new Date().toISOString()
      });
      onRefresh?.();
    });
  };

  const getParmValStr = (tooth: number, param: string, side: "buccal" | "lingual") => {
     const pd = data[tooth]?.[param];
     if (!pd) return "00-00-00";
     if (pd.single !== undefined) return `  ${pd.single.toString().padStart(2, '0')}  `;
     return `${pd[side][0].toString().padStart(2, '0')}-${pd[side][1].toString().padStart(2, '0')}-${pd[side][2].toString().padStart(2, '0')}`;
  };
  
  const renderValueTable = (tooth: number, param: string) => {
    const values = param === "Suppuration" || param === "Bleeding" ? [0, 1] : Array.from({length: 14}, (_, i) => i);
    
    return (
      <PopoverContent className="w-[340px] p-0 rounded-2xl shadow-2xl border-gray-100 dark:border-slate-800 overflow-hidden bg-[#e0e0e0] dark:bg-slate-900">
        <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-800">
           <div className="w-10 h-12 bg-blue-500 rounded-xl flex flex-col items-center justify-center text-white font-bold p-1">
              <ToothVisual toothId={tooth-1} isTop={true} className="w-4 h-6 rotate-180" stroke="white" fill="transparent" />
              <span className="text-[10px] leading-none mt-1">{tooth - 1}</span>
           </div>
           
           <Button 
             onClick={() => {
               saveMeasurement(tooth, param);
               setOpenPopover(null);
             }} 
             disabled={isPending}
             className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl h-10 px-6 shadow-sm"
           >
             {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('measureDialog.submitClose')}
           </Button>

           <div className="w-10 h-12 bg-blue-500 rounded-xl flex flex-col items-center justify-center text-white font-bold p-1">
              <span className="text-[10px] leading-none mb-1">{tooth + 1}</span>
              <ToothVisual toothId={tooth+1} isTop={false} className="w-4 h-6" stroke="white" fill="transparent" />
           </div>
        </div>

        <div className="text-center py-2">
           <div className="text-lg font-bold text-gray-800 dark:text-white flex items-center justify-center gap-1">
             <ToothVisual toothId={tooth} isTop={false} className="w-4 h-6 opacity-50" stroke="#6b7280" fill="transparent" />
              {param !== "Suppuration" ? t('measureDialog.titleMm', { tooth, param: paramLabels[param as keyof typeof paramLabels] || param }) : t('measureDialog.title', { tooth, param: paramLabels[param as keyof typeof paramLabels] || param })}
           </div>
        </div>

        <div className="flex w-full px-2 gap-1 pb-2 h-72">
           <div className="flex-1 bg-[#800000] rounded-xl flex flex-col overflow-hidden text-center text-white font-semibold">
              <div className="p-1 pb-0 text-sm">{t('views.buccal')}</div>
              <div className="flex text-[10px] border-b border-white/20 pb-1">
                <div className="flex-1">{t('anatomy.mesial')}</div>
                <div className="flex-1">{t('anatomy.middle')}</div>
                <div className="flex-1">{t('anatomy.distal')}</div>
              </div>
              <div className="flex-1 flex overflow-y-auto w-full p-1 scrollbar-hide">
                 {[0, 1, 2].map(col => (
                   <div key={col} className="flex-1 flex flex-col gap-1 px-0.5">
                     {values.map(v => {
                       const isSelected = data[tooth]?.[param]?.buccal?.[col] === v;
                       return (
                         <div key={v} onClick={() => setParamValue(tooth, param, 'buccal', col, v)} className={`rounded-full border text-xs py-1 hover:bg-white/20 cursor-pointer ${isSelected ? 'bg-white text-[#800000] border-white font-bold shadow-sm' : 'border-white/20'}`}>
                           {v}
                         </div>
                       )
                     })}
                   </div>
                 ))}
              </div>
           </div>

           <div className="flex-1 bg-[#0000cd] rounded-xl flex flex-col overflow-hidden text-center text-white font-semibold">
              <div className="p-1 pb-0 text-sm">{t('views.lingual')}</div>
              <div className="flex text-[10px] border-b border-white/20 pb-1">
                <div className="flex-1">{t('anatomy.mesial')}</div>
                <div className="flex-1">{t('anatomy.middle')}</div>
                <div className="flex-1">{t('anatomy.distal')}</div>
              </div>
              <div className="flex-1 flex overflow-y-auto w-full p-1 scrollbar-hide">
                 {[0, 1, 2].map(col => (
                   <div key={col} className="flex-1 flex flex-col gap-1 px-0.5">
                     {values.map(v => {
                       const isSelected = data[tooth]?.[param]?.lingual?.[col] === v;
                       return (
                         <div key={v} onClick={() => setParamValue(tooth, param, 'lingual', col, v)} className={`rounded-full border text-xs py-1 hover:bg-white/20 cursor-pointer ${isSelected ? 'bg-white text-[#0000cd] border-white font-bold shadow-sm' : 'border-white/20'}`}>
                           {v}
                         </div>
                       )
                     })}
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="bg-[#e0e0e0] dark:bg-slate-900 p-3 text-center border-t border-gray-300 dark:border-slate-800">
           <div className="text-gray-700 dark:text-slate-300 text-base font-semibold border-y-2 border-blue-500 py-1 px-4 inline-block">
             {getMeasurementDate(tooth, param)}
           </div>
        </div>
      </PopoverContent>
    );
  };

  const renderSingleValueDropdown = (tooth: number, param: string) => {
    return (
      <PopoverContent className="w-[280px] p-0 rounded-2xl shadow-2xl border-gray-100 dark:border-slate-800 overflow-hidden bg-[#e0e0e0] dark:bg-slate-900">
        <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-800">
           <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold p-1">
              <span className="text-[12px]">{tooth - 1}</span>
           </div>
           <Button
             onClick={() => {
               saveMeasurement(tooth, param);
               setOpenPopover(null);
             }}
             disabled={isPending}
             className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl h-10 px-6 shadow-sm"
           >
             {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('measureDialog.submitClose')}
           </Button>
           <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold p-1">
              <span className="text-[12px]">{tooth + 1}</span>
           </div>
        </div>
        
        <div className="text-center py-4">
           <div className="text-lg font-bold text-gray-800 dark:text-white flex items-center justify-center gap-1">
             <ToothVisual toothId={tooth} isTop={false} className="w-4 h-6 opacity-50" stroke="#6b7280" fill="transparent" />
             #{tooth} {param}
           </div>
        </div>

        <div className="flex flex-col items-center gap-2 pb-6 px-4">
           {[0, 1, 2, 3, 4].map(v => {
             const isSelected = data[tooth]?.[param]?.single === v;
             return (
               <div key={v} onClick={() => setSingleValue(tooth, param, v)} className={`w-16 h-8 flex items-center justify-center rounded-full border-2 cursor-pointer font-bold ${isSelected ? 'bg-blue-500 text-white border-blue-600' : 'bg-transparent border-gray-400 text-gray-600 hover:border-gray-600'}`}>
                 {v}
               </div>
             )
           })}
        </div>

        <div className="bg-[#e0e0e0] dark:bg-slate-900 p-4 text-center border-t border-gray-300 dark:border-slate-800">
           <div className="text-gray-700 dark:text-slate-300 text-base font-semibold border-y-2 border-blue-500 py-1 px-4 inline-block">
             {getMeasurementDate(tooth, param)}
           </div>
        </div>
      </PopoverContent>
    );
  };

  const renderTooth = (tooth: number, isTop: boolean) => {
    return (
      <Popover key={tooth} open={openPopover === tooth} onOpenChange={(open) => setOpenPopover(open ? tooth : null)}>
        <PopoverTrigger asChild>
          <button className="focus:outline-none bg-transparent border-0 p-0 m-0 w-full text-left cursor-pointer">
            <ToothCell
              toothId={tooth}
              isTop={isTop}
              className="group"
              label={String(tooth)}
              extraContent={
                <div className="flex flex-col gap-0.5 items-center justify-center py-2 h-16 text-center w-full transition-opacity">
                  <div className={cn("text-[#800000] dark:text-[#ff6b6b] text-[9px] font-mono leading-tight tracking-tighter transition-opacity duration-200", showBuccal ? 'opacity-100' : 'opacity-0')}>
                    {getParmValStr(tooth, activeParam, 'buccal')}
                  </div>
                  <div className={cn("text-[#0000cd] dark:text-[#4d4dff] text-[9px] font-mono leading-tight tracking-tighter transition-opacity duration-200", showLingual ? 'opacity-100' : 'opacity-0')}>
                    {getParmValStr(tooth, activeParam, 'lingual')}
                  </div>
                  <div className="h-4 flex items-center justify-center w-full">
                    <div className="w-[80%] h-[2px] border-b-[1.5px] border-dashed border-[#0000cd]" />
                  </div>
                </div>
              }
            >
              <div className="relative w-10 h-[60px] flex items-center justify-center bg-transparent cursor-pointer hover:bg-white/30 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                <ToothVisual
                  toothId={tooth}
                  isTop={isTop}
                  className="w-full h-full"
                  fill="white"
                  stroke="black"
                />
                <div className={`absolute left-0 right-0 h-px bg-[#0000cd] z-10 ${isTop ? "bottom-4" : "top-4"}`} />
                <div className={`absolute left-0 right-0 h-[4px] bg-[#0000cd] rounded-full w-1 mx-auto z-10 ${isTop ? "bottom-[14px]" : "top-[14px]"}`} />
              </div>
            </ToothCell>
          </button>
        </PopoverTrigger>
        
        {(activeParam === "Mobility" || activeParam === "Furcation") ? renderSingleValueDropdown(tooth, activeParam) : renderValueTable(tooth, activeParam)}
      </Popover>
    )
  }

  return (
    <div className="w-full bg-[#f5f5f5] dark:bg-slate-900 rounded-3xl overflow-hidden border border-gray-200 dark:border-slate-800 animate-fade-in-up">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-center py-2 text-lg">
        {t('title')}
      </div>

      <div className="p-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Select value={selectedSessionId || ''} onValueChange={setSelectedSessionId} disabled={isPending || sessions.length === 0}>
              <SelectTrigger className="w-[240px] font-semibold bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 dark:text-white">
                <SelectValue placeholder={t('noSessions')} />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((session: any) => (
                  <SelectItem key={session.id} value={session.id}>
                    {new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedSessionId && (
              <Button
                variant="outline"
                onClick={() => {
                  if(confirm(t('deleteSession') + '?')) {
                    isUpdatingRef.current = true;
                    startTransition(async () => {
                      await deletePeriodontalSession(patient.id, selectedSessionId);
                      setSelectedSessionId(sessions.find((s: any) => s.id !== selectedSessionId)?.id ?? null);
                      isUpdatingRef.current = false;
                      onRefresh?.();
                    });
                  }
                }}
                disabled={isPending}
                className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 px-3"
                title={t('deleteSession')}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            )}
          </div>
          
          <Button
            onClick={() => {
              isUpdatingRef.current = true;
              startTransition(async () => {
                const res = await createPeriodontalSession(patient.id);
                if(res.success && res.data) {
                  setSelectedSessionId(res.data.id);
                }
                isUpdatingRef.current = false;
                onRefresh?.();
              });
            }}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 shadow-sm"
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : t('newSession')}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {parameters.map(p => (
            <Button
              key={p}
              variant="outline"
              onClick={() => setActiveParam(p)}
              className={cn(
                "rounded-full border-2 text-xs font-semibold h-9",
                p === activeParam ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-600 dark:border-blue-500" : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700"
              )}
            >
              {paramLabels[p as keyof typeof paramLabels] || p}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex h-auto w-full">
        <div className="w-20 bg-[#dbe2ea] dark:bg-slate-800 border-r border-gray-300 dark:border-slate-700 flex flex-col items-center gap-6 py-6 shrink-0 z-20">
           <Button onClick={() => setIsRotated(!isRotated)} className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-2 rounded-2xl h-12 w-12 shadow-sm flex flex-col items-center justify-center">
             <RotateCw className={cn("w-5 h-5 mb-0.5 transition-transform duration-300", isRotated ? 'rotate-90' : '')} />
             <span className="text-[9px] font-bold">90°</span>
           </Button>

           <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setShowLingual(!showLingual)}>
             <div className="w-6 h-6 bg-[#0000cd] dark:bg-[#4d4dff] rounded-md flex items-center justify-center text-white mb-1 shadow-sm">
               {showLingual ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
             </div>
             <span className="text-[10px] text-[#0000cd] dark:text-[#4d4dff] font-bold text-center leading-tight">{t('views.lingual')}</span>
           </div>

           <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setShowBuccal(!showBuccal)}>
             <div className="w-6 h-6 bg-white dark:bg-slate-700 border-2 border-[#800000] dark:border-[#ff6b6b] rounded-md flex items-center justify-center text-[#800000] dark:text-[#ff6b6b] mb-1 shadow-sm">
               {showBuccal ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
             </div>
             <span className="text-[10px] text-[#800000] dark:text-[#ff6b6b] font-bold text-center leading-tight">{t('views.buccal')}</span>
           </div>
        </div>

        <div className="flex-1 overflow-x-auto bg-blue-50/50 dark:bg-slate-900/50 p-6 pt-8 pb-10 flex items-center justify-center">
            <DentalGrid 
              renderTooth={renderTooth} 
              className={cn("bg-transparent border-0 shadow-none p-0 max-w-none transition-transform duration-500 origin-center", isRotated ? 'rotate-90' : 'rotate-0')}
              showQuadrants={false}
            />
        </div>
      </div>
    </div>
  );
}
