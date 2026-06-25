'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { previewCampaignAudience, createAndSendCampaign } from '@/app/actions/campaigns';
import { CampaignFilters } from '@/services/smsCampaignService';
import { Loader2, Users, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function CampaignBuilder() {
  const router = useRouter();
  const t = useTranslations('campaigns');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  
  const [filters, setFilters] = useState<CampaignFilters>({
    hasBalance: false,
  });

  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [isLoadingAudience, setIsLoadingAudience] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced Audience calculation
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoadingAudience(true);
      const res = await previewCampaignAudience(filters);
      if (res.success && res.count !== undefined) {
        setAudienceCount(res.count);
      } else {
        setAudienceCount(null);
        if (res.error) toast.error(t('errors.loadHistoryFailed') + ": " + res.error);
      }
      setIsLoadingAudience(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [filters, t]);

  const handleSend = async () => {
    if (!name) return toast.error(t('errors.nameRequired'));
    if (!message) return toast.error(t('errors.messageRequired'));
    if (audienceCount === 0) return toast.error(t('errors.audienceEmpty'));
    if (audienceCount && audienceCount > 1000) return toast.error(t('errors.audienceLimitExceeded'));

    setIsSubmitting(true);
    const res = await createAndSendCampaign({ name, message, filters });
    setIsSubmitting(false);

    if (res.success) {
      toast.success(t('toasts.campaignLaunched'));
      router.refresh();
      // Reset form
      setName('');
      setMessage('');
      setFilters({ hasBalance: false });
    } else {
      toast.error(res.error || t('errors.launchFailed'));
    }
  };

  const handleFilterChange = (key: keyof CampaignFilters, value: any) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (value === "" || value === undefined) {
        delete newFilters[key];
      } else {
        (newFilters as any)[key] = value;
      }
      return newFilters;
    });
  };

  const previewMessage = () => {
    let prev = message || t('form.previewPlaceholder');
    prev = prev.replace(/{{patient_name}}/g, 'John Doe');
    prev = prev.replace(/{{clinic_name}}/g, 'Neoliva Dental');
    prev = prev.replace(/{{appointment_date}}/g, '12/10/2026');
    return prev;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('filters.title')}</CardTitle>
            <CardDescription>{t('filters.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('filters.lastVisit')}</Label>
              <Input 
                type="number" 
                placeholder={t('filters.lastVisitPlaceholder')} 
                onChange={(e) => handleFilterChange('lastVisitMonths', e.target.value ? parseInt(e.target.value) : undefined)}
              />
              <p className="text-xs text-muted-foreground">{t('filters.lastVisitHelp')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('filters.minAge')}</Label>
                <Input 
                  type="number" 
                  placeholder="e.g., 18" 
                  onChange={(e) => handleFilterChange('minAge', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('filters.maxAge')}</Label>
                <Input 
                  type="number" 
                  placeholder="e.g., 65" 
                  onChange={(e) => handleFilterChange('maxAge', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('filters.gender')}</Label>
              <Select onValueChange={(val) => handleFilterChange('gender', val === 'ALL' ? undefined : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('filters.anyGender')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('filters.genderAny')}</SelectItem>
                  <SelectItem value="Male">{t('filters.genderMale')}</SelectItem>
                  <SelectItem value="Female">{t('filters.genderFemale')}</SelectItem>
                  <SelectItem value="Other">{t('filters.genderOther')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('filters.procedure')}</Label>
              <Input 
                placeholder={t('filters.procedurePlaceholder')} 
                onChange={(e) => handleFilterChange('procedures', e.target.value ? e.target.value.split(',').map(s => s.trim()) : undefined)}
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch 
                id="has-balance" 
                checked={filters.hasBalance}
                onCheckedChange={(val) => handleFilterChange('hasBalance', val)}
              />
              <Label htmlFor="has-balance">{t('filters.outstandingBalance')}</Label>
            </div>

            <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-4 h-4" />
                {t('stats.audienceSize')}
              </div>
              <div className="text-xl font-bold">
                {isLoadingAudience ? <Loader2 className="w-5 h-5 animate-spin" /> : (audienceCount !== null ? audienceCount : '-')}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('form.composeTitle')}</CardTitle>
            <CardDescription>{t('form.composeDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('form.campaignNameInternal')}</Label>
              <Input 
                placeholder={t('form.campaignNamePlaceholder')} 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Label>{t('form.messageLabel')}</Label>
                <span className={`text-xs ${message.length > 160 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                  {message.length} / 160 {t('form.chars')}
                </span>
              </div>
              <Textarea 
                placeholder={t('form.messagePlaceholder')}
                className="h-32"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setMessage(m => m + '{{patient_name}}')}>{t('form.variablePatientName')}</Button>
                <Button variant="outline" size="sm" onClick={() => setMessage(m => m + '{{clinic_name}}')}>{t('form.variableClinicName')}</Button>
                <Button variant="outline" size="sm" onClick={() => setMessage(m => m + '{{appointment_date}}')}>{t('form.variableApptDate')}</Button>
              </div>
            </div>

            <div className="mt-4">
              <Label className="text-xs text-muted-foreground mb-2 block">{t('form.messagePreview')}</Label>
              <div className="p-3 bg-secondary text-secondary-foreground rounded-lg rounded-bl-none max-w-[85%] text-sm whitespace-pre-wrap">
                {previewMessage()}
              </div>
            </div>

          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleSend} 
              disabled={isSubmitting || isLoadingAudience || audienceCount === 0 || message.length > 160}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {audienceCount ? t('actions.launchCampaignWithCount', { count: audienceCount }) : t('actions.launchCampaign')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
