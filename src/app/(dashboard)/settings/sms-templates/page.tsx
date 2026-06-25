import { getTemplates } from '@/app/actions/smsTemplates';
import { getUserSession } from '@/lib/rbac/session';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateList } from './TemplateList';
import { MessageSquareText } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('campaigns');
  return {
    title: `${t('smsTemplates.title')} | Neoliva`,
  };
}

export default async function SmsTemplatesPage() {
  const session = await getUserSession();
  if (!session) {
    redirect('/auth/login');
  }

  const { templates, success, error } = await getTemplates();
  const canEdit = session.role === 'OWNER' || session.role === 'MANAGER';
  const t = await getTranslations('campaigns');

  if (!success) {
    return <div className="p-6 text-destructive">{t('errors.loadTemplatesFailed')}: {error}</div>;
  }

  const typedTemplates = templates as any[] || [];

  const reminders = typedTemplates.filter(t => t.category === 'REMINDERS');
  const occasions = typedTemplates.filter(t => t.category === 'OCCASIONS');
  const campaigns = typedTemplates.filter(t => t.category === 'CAMPAIGNS');

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('smsTemplates.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('smsTemplates.description')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
          <MessageSquareText className="w-4 h-4" />
          <span>{t('smsTemplates.charsHelp')}</span>
        </div>
      </div>

      <Tabs defaultValue="REMINDERS" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="REMINDERS">{t('smsTemplates.categories.reminders')} ({reminders.length})</TabsTrigger>
          <TabsTrigger value="OCCASIONS">{t('smsTemplates.categories.occasions')} ({occasions.length})</TabsTrigger>
          <TabsTrigger value="CAMPAIGNS">{t('smsTemplates.categories.campaigns')} ({campaigns.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="REMINDERS">
          <TemplateList category="REMINDERS" templates={reminders} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="OCCASIONS">
          <TemplateList category="OCCASIONS" templates={occasions} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="CAMPAIGNS">
          <TemplateList category="CAMPAIGNS" templates={campaigns} canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
