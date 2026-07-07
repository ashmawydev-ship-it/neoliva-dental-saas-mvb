"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, UserPen, Shield, Mail, Phone, Percent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { EditStaffDialog } from "./EditStaffDialog";
import { CommissionRateDialog } from "./CommissionRateDialog";
import { useTranslations } from "next-intl";

const roleConfig: Record<string, { bg: string; text: string; icon: string }> = {
  OWNER: { bg: "bg-rose-500/10 dark:bg-rose-500/20", text: "text-rose-600 dark:text-rose-400", icon: "💎" },
  ADMIN: { bg: "bg-purple-500/10 dark:bg-purple-500/20", text: "text-purple-600 dark:text-purple-400", icon: "👑" },
  MANAGER: { bg: "bg-indigo-500/10 dark:bg-indigo-500/20", text: "text-indigo-600 dark:text-indigo-400", icon: "📋" },
  DOCTOR: { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400", icon: "🩺" },
  ACCOUNTANT: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", icon: "💰" },
  STAFF: { bg: "bg-slate-500/10 dark:bg-slate-500/20", text: "text-slate-600 dark:text-slate-400", icon: "👥" },
  // Fallbacks for legacy/UI display
  Admin: { bg: "bg-purple-500/10 dark:bg-purple-500/20", text: "text-purple-600 dark:text-purple-400", icon: "👑" },
  Doctor: { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400", icon: "🩺" },
  Assistant: { bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", icon: "💉" },
  Receptionist: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", icon: "📞" },
};

export function StaffTable({ initialStaff }: { initialStaff: any[] }) {
  const [search, setSearch] = useState("");
  const [editingMember, setEditingMember] = useState<any>(null);
  const [commissionMember, setCommissionMember] = useState<any>(null);
  const t = useTranslations("staff");

  const filteredStaff = initialStaff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  const isDoctor = (role: string) => role.toUpperCase() === "DOCTOR";

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search staff..." 
          className="pl-10 h-10 rounded-xl bg-card border-border focus-visible:ring-blue-500/20 text-foreground placeholder:text-muted-foreground/70" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('table.name')}</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('table.role')}</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('table.email')}</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('table.status')}</TableHead>
              <TableHead className="w-[100px] text-muted-foreground text-xs font-semibold uppercase tracking-wider">{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.map((member) => {
              const config = roleConfig[member.role] || roleConfig.Receptionist;
              return (
                <TableRow key={member.id} className="table-row-hover group border-border">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${member.color} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
                          {member.avatar}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                          member.isPending ? "bg-amber-400" : (member.status === "Active" ? "bg-emerald-400" : "bg-gray-300")
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.title}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={`${config.bg} ${config.text} border-none text-[11px] font-semibold rounded-full px-2.5 shadow-none`}>
                        <span className="mr-1">{config.icon}</span> {t.has(`roles.${member.role.toLowerCase()}`) ? t(`roles.${member.role.toLowerCase()}`) : member.role}
                      </Badge>
                      {isDoctor(member.role) && member.commissionRate > 0 && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none text-[10px] font-semibold rounded-full px-2 shadow-none">
                          {member.commissionRate}%
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3 text-muted-foreground/70" /> {member.email}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground/70" /> {member.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {member.isPending ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          <span className="text-xs text-amber-600 font-medium">{t('status.pending')}</span>
                        </>
                      ) : (
                        <>
                          <div className={`w-2 h-2 rounded-full ${member.status === "Active" ? "bg-emerald-400" : "bg-gray-300"}`} />
                          <span className="text-xs text-muted-foreground">
                            {member.status === "Active" ? t('status.active') : t('status.inactive')}
                          </span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {isDoctor(member.role) && member.staffId && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all active:scale-90"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCommissionMember(member);
                          }}
                          title="Commission Rate"
                        >
                          <Percent className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-muted rounded-lg transition-all active:scale-90"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingMember(member);
                        }}
                      >
                        <UserPen className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredStaff.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No staff members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {editingMember && (
        <EditStaffDialog 
          member={editingMember} 
          open={!!editingMember} 
          onOpenChange={(open) => !open && setEditingMember(null)} 
        />
      )}

      {commissionMember && commissionMember.staffId && (
        <CommissionRateDialog
          staffId={commissionMember.staffId}
          staffName={commissionMember.name}
          currentRate={commissionMember.commissionRate || 0}
          open={!!commissionMember}
          onOpenChange={(open) => !open && setCommissionMember(null)}
        />
      )}
    </div>
  );
}
