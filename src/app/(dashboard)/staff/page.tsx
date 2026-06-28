export const dynamic = 'force-dynamic';
import { Card, CardContent } from "@/components/ui/card";
import { NewStaffDialog } from "@/components/staff/NewStaffDialog";
import { StaffTable } from "@/components/staff/StaffTable";
import { getStaff } from "@/app/actions/staff";
import { getTranslations } from "next-intl/server";

const roleConfig: Record<string, { bg: string; text: string; icon: string }> = {
  Admin: { bg: "bg-purple-100 dark:bg-purple-500/10", text: "text-purple-700 dark:text-purple-400", icon: "👑" },
  Doctor: { bg: "bg-blue-100 dark:bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", icon: "🩺" },
  Assistant: { bg: "bg-emerald-100 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", icon: "💉" },
  Receptionist: { bg: "bg-amber-100 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", icon: "📞" },
};

export default async function StaffPage() {
  const staffList = await getStaff();
  const t = await getTranslations('staff');

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>
        <NewStaffDialog />
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        {Object.entries(roleConfig).map(([role, config]) => (
          <Card key={role} className="border-0 shadow-sm card-hover dark:bg-slate-900">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center text-lg`}>
                {config.icon}
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{staffList.filter((s) => s.role === role).length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t.has(`roles.${role.toLowerCase()}`) ? t(`roles.${role.toLowerCase()}`) : role}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <StaffTable initialStaff={staffList} />
    </div>
  );
}
