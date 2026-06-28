"use client";

import { useState, useRef, useTransition, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileImage, 
  FileText, 
  UploadCloud, 
  Download, 
  Eye, 
  FileSignature, 
  Loader2, 
  Trash2, 
  MoreVertical,
  Layers,
  FileSearch,
  Scan,
  X
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadDocument, deleteDocument } from "@/app/actions/documents";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function PatientDocuments({ 
  patientId, 
  tenantId,
  initialData = [], 
  onRefresh
}: { 
  patientId: string, 
  tenantId: string,
  initialData?: any[],
  onRefresh?: () => void
}) {
  const t = useTranslations('patientDocs');
  
  const CATEGORIES = useMemo(() => [
    { id: 'xray', label: t('filters.xray'), icon: Scan, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'document', label: t('filters.documents'), icon: FileText, color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { id: 'other', label: t('filters.other'), icon: Layers, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800/50' },
  ], [t]);

  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: "", category: "document" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [docsWithUrls, setDocsWithUrls] = useState<any[]>(initialData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  // Handle Signed URLs for internal storage paths
  useEffect(() => {
    async function loadSignedUrls() {
      const updatedDocs = await Promise.all(
        initialData.map(async (doc) => {
          if (doc.fileUrl && !doc.fileUrl.startsWith("http")) {
            const { data } = await supabase.storage
              .from("patient-documents")
              .createSignedUrl(doc.fileUrl, 3600);
            return { ...doc, displayUrl: data?.signedUrl || doc.fileUrl };
          }
          return { ...doc, displayUrl: doc.fileUrl };
        })
      );
      setDocsWithUrls(updatedDocs);
    }
    loadSignedUrls();
  }, [initialData, supabase]);

  const filteredDocs = activeFilter 
    ? docsWithUrls.filter(d => (d.category || 'other') === activeFilter)
    : docsWithUrls;

  const handleUpload = async () => {
    if (!newDoc.name || !selectedFile || !patientId) {
      toast.error(t('toast.nameRequired'));
      return;
    }
    
    setIsUploading(true);
    const toastId = toast.loading(t('toast.uploading'));
    
    try {
      const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/dicom'];
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      const isAllowedExt = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'dcm', 'dicom'].includes(fileExt || '');

      if (!ALLOWED_TYPES.includes(selectedFile.type) && !isAllowedExt) {
        toast.error("Unsupported file type. Please upload a PDF, JPG, PNG, WEBP, or DICOM file.", { id: toastId });
        setIsUploading(false);
        return;
      }

      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error(t('toast.fileTooLarge'), { id: toastId });
        setIsUploading(false);
        return;
      }

      const fileName = `${tenantId}/${patientId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('patient-documents')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const result = await uploadDocument(patientId, {
        name: newDoc.name,
        type: selectedFile.type,
        category: newDoc.category,
        fileUrl: fileName // Store the internal path
      });

      if (result?.success) {
        toast.success(t('toast.uploaded'), { id: toastId });
        setOpen(false);
        setNewDoc({ name: "", category: "document" });
        setSelectedFile(null);
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.error || "Failed to save metadata");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t('toast.unexpectedError'), { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, fileUrl: string) => {
    if (!confirm(t('fileCard.deleteConfirm'))) return;
    
    const toastId = toast.loading(t('toast.deleting'));
    try {
      const result = await deleteDocument(patientId, docId, fileUrl);
      if (result.success) {
        toast.success(t('toast.deleted'), { id: toastId });
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message || t('toast.deleteFailed'), { id: toastId });
    }
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.id === category) || CATEGORIES[2];
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('title')}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">{t('subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 text-white font-bold h-11 px-6 transition-all active:scale-95">
                <UploadCloud className="w-4 h-4 mr-2" /> {t('uploadRecord')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border-0 shadow-2xl">
              <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                <DialogTitle className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-indigo-600" />
                  {t('uploadDialog.title')}
                </DialogTitle>
              </DialogHeader>
              
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="doc-name" className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('uploadDialog.fileName')}</Label>
                  <Input 
                    id="doc-name" 
                    placeholder={t('uploadDialog.phFileName')} 
                    value={newDoc.name} 
                    onChange={(e) => setNewDoc({...newDoc, name: e.target.value})}
                    className="h-11 rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-800/30 focus:ring-indigo-500/20 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('uploadDialog.category')}</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewDoc({...newDoc, category: cat.id})}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2",
                          newDoc.category === cat.id 
                            ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" 
                            : "border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-400 dark:text-slate-400 hover:border-gray-200 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
                        )}
                      >
                        <cat.icon className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase text-center leading-tight">
                          {cat.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select File</Label>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        setSelectedFile(files[0]);
                        if (!newDoc.name) {
                          setNewDoc({ ...newDoc, name: files[0].name.split('.')[0] });
                        }
                      }
                    }}
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer",
                      selectedFile 
                        ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-900/10" 
                        : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500"
                    )}
                  >
                     {selectedFile ? (
                       <div className="flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
                         <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-3">
                           <FileSearch className="w-6 h-6" />
                         </div>
                         <p className="text-sm font-bold text-gray-900 dark:text-white break-all px-4">{selectedFile.name}</p>
                         <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                         <Button variant="ghost" size="sm" onClick={(e) => {
                           e.stopPropagation();
                           setSelectedFile(null);
                         }} className="mt-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-7 rounded-lg text-xs">
                           <X className="w-3 h-3 mr-1" /> Change
                         </Button>
                       </div>
                     ) : (
                       <div className="space-y-2">
                         <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-full shadow-sm flex items-center justify-center mx-auto text-gray-400 dark:text-slate-300">
                           <UploadCloud className="w-6 h-6" />
                         </div>
                         <p className="text-sm font-bold text-gray-700 dark:text-slate-300">Click to browse files</p>
                         <p className="text-[10px] text-gray-400 font-medium">Supports Images, PDF, DICOM up to 50MB</p>
                       </div>
                     )}
                  </div>
                </div>
              </div>

              <DialogFooter className="p-6 bg-gray-50/50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800">
                <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl h-11 px-6 font-semibold text-gray-500">{t('uploadDialog.cancel')}</Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading || !selectedFile} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-8 font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('uploadDialog.upload')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <Button 
          variant={activeFilter === null ? 'default' : 'ghost'} 
          onClick={() => setActiveFilter(null)}
          className={cn(
            "rounded-full h-8 px-4 text-xs font-bold transition-all",
            activeFilter === null ? "bg-indigo-600 text-white" : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
          )}
        >
          {t('filters.all')}
        </Button>
        {CATEGORIES.map(cat => (
          <Button 
            key={cat.id}
            variant={activeFilter === cat.id ? 'default' : 'ghost'} 
            onClick={() => setActiveFilter(cat.id)}
            className={cn(
              "rounded-full h-8 px-4 text-xs font-bold transition-all flex items-center gap-2",
              activeFilter === cat.id ? "bg-indigo-600 text-white" : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            )}
          >
            <cat.icon className="w-3 h-3" />
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Grid View */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredDocs.length === 0 ? (
          <div className="col-span-full py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-200 dark:text-slate-600 mb-4">
              <FileSearch className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{t('empty.title')}</h4>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              {activeFilter ? t('empty.category', { category: getCategoryInfo(activeFilter).label }) : t('empty.general')}
            </p>
          </div>
        ) : (
          filteredDocs.map((doc: any) => {
            const cat = getCategoryInfo(doc.category);
            const isImage = doc.type.startsWith('image/');
            const isPdf = doc.type === 'application/pdf';

            return (
              <Card key={doc.id} className="group border-0 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                {/* Preview Area */}
                <div className="aspect-[4/3] bg-gray-100 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
                  {isImage ? (
                    <img 
                      src={doc.displayUrl} 
                      alt={doc.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", cat.bg, cat.color)}>
                      <cat.icon className="w-8 h-8" />
                    </div>
                  )}
                  
                  <div className="absolute top-2 left-2">
                    <Badge className={cn("bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-0 shadow-sm font-bold text-[9px] uppercase tracking-wider h-5 px-2", cat.color)}>
                      {cat.id}
                    </Badge>
                  </div>

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button 
                      size="sm" 
                      className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-bold shadow-lg"
                      onClick={() => window.open(doc.displayUrl, "_blank")}
                    >
                      <Eye className="w-4 h-4 mr-2" /> Open
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug truncate" title={doc.name}>{doc.name}</h4>
                      <p className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">
                        {new Date(doc.uploadDate || doc.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl p-1 border-gray-100 dark:border-slate-800 dark:bg-slate-900">
                        <DropdownMenuItem onClick={() => window.open(doc.displayUrl, "_blank")} className="rounded-lg gap-2 cursor-pointer py-2">
                          <Download className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-bold">{t('fileCard.download')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(doc.id, doc.fileUrl)} className="rounded-lg gap-2 cursor-pointer py-2 text-red-600 focus:text-red-600 focus:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                          <span className="text-xs font-bold">{t('fileCard.delete')}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 p-2 rounded-lg border border-gray-100/50 dark:border-slate-700/50">
                    <FileSearch className="w-3 h-3 shrink-0" />
                    <span className="truncate">{doc.type.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Stats/Summary Footer (Optional) */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 p-6 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{initialData.length} Total Records</p>
            <p className="text-xs text-gray-500">All data is securely encrypted and isolated.</p>
          </div>
        </div>
        <div className="flex gap-4">
          {CATEGORIES.map(cat => (
            <div key={cat.id} className="text-center">
              <p className="text-lg font-black text-gray-800 dark:text-slate-200">{initialData.filter(d => (d.category || 'other') === cat.id).length}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{cat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
