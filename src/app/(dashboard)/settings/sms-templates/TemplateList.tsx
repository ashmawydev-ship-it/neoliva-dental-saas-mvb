'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Edit2, Copy, Trash2, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { updateSmsTemplate, deleteSmsTemplate, duplicateSmsTemplate } from '@/app/actions/smsTemplates';
import { TemplateEditorModal } from './TemplateEditorModal';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations, useLocale } from 'next-intl';
import { ar, enUS } from 'date-fns/locale';

export function TemplateList({ category, templates, canEdit }: { category: string, templates: any[], canEdit: boolean }) {
  const t = useTranslations('campaigns');
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? ar : enUS;
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    if (!canEdit) return toast.error(t('errors.noPermission'));
    const res = await updateSmsTemplate(id, { isActive: !currentStatus });
    if (res.success) {
      toast.success(!currentStatus ? t('toasts.templateActivated') : t('toasts.templateDeactivated'));
    }
    else toast.error(t('errors.updateFailed') + ": " + res.error);
  };

  const handleDuplicate = async (id: string) => {
    if (!canEdit) return toast.error(t('errors.noPermission'));
    const res = await duplicateSmsTemplate(id);
    if (res.success) toast.success(t('toasts.templateDuplicated'));
    else toast.error(t('errors.duplicateFailed') + ": " + res.error);
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return toast.error(t('errors.noPermission'));
    if (!confirm(t('smsTemplates.confirmDelete'))) return;
    const res = await deleteSmsTemplate(id);
    if (res.success) toast.success(t('toasts.templateDeleted'));
    else toast.error(t('errors.deleteFailed') + ": " + res.error);
  };

  const renderMessageWithHighlights = (msg: string) => {
    const parts = msg.split(/(\{\{.*?\}\})/g);
    return parts.map((part, i) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        return <span key={i} className="text-purple-600 font-medium">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{t('smsTemplates.categories.' + category.toLowerCase())}</h2>
        {canEdit && (
          <Button onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            {t('smsTemplates.newTemplate')}
          </Button>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-10 bg-muted/20 border border-dashed rounded-lg text-muted-foreground">
          {t('smsTemplates.noTemplates') || "No templates found in this category."}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {templates.map(tData => {
            const smsSegments = Math.ceil(tData.message.length / 160) || 1;
            return (
              <Card key={tData.id} className={!tData.isActive ? 'opacity-75' : ''}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {tData.name}
                      {!tData.isActive && <Badge variant="secondary" className="text-[10px]">{t('smsTemplates.inactive') || 'Inactive'}</Badge>}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {t('history.created', { time: tData.updatedAt ? formatDistanceToNow(new Date(tData.updatedAt), { addSuffix: true, locale: dateLocale }) : 'N/A' })}
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`status-${tData.id}`} className="sr-only">Toggle Status</Label>
                      <Switch 
                        id={`status-${tData.id}`}
                        checked={tData.isActive}
                        onCheckedChange={() => toggleStatus(tData.id, tData.isActive)}
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="bg-muted/50 p-3 rounded-md text-sm whitespace-pre-wrap min-h-[80px]">
                    {renderMessageWithHighlights(tData.message)}
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>{t('smsTemplates.charsCount', { count: tData.message.length })}</span>
                    <span>{smsSegments > 1 ? t('smsTemplates.segmentsCount', { count: smsSegments }) : t('smsTemplates.segmentCount', { count: smsSegments })}</span>
                  </div>
                </CardContent>
                {canEdit && (
                  <CardFooter className="pt-0 flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDuplicate(tData.id)} title={t('actions.duplicate')}>
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditingTemplate(tData); setEditorOpen(true); }} title={t('actions.edit')}>
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(tData.id)} title={t('actions.delete')} className="hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {editorOpen && (
        <TemplateEditorModal 
          open={editorOpen} 
          onOpenChange={setEditorOpen} 
          template={editingTemplate} 
          category={category as any}
        />
      )}
    </div>
  );
}
