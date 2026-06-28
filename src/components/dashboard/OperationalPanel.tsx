"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Clock, 
  MoreHorizontal, 
  UserPlus,
  Play,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDoctorName } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface QueueItem {
  id: string;
  patientName: string;
  doctorName: string;
  time: string;
  waitTime: number;
  status: string;
}

interface OperationalPanelProps {
  queue: QueueItem[];
}

export function OperationalPanel({ queue }: OperationalPanelProps) {
  const t = useTranslations("dashboard");

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return { color: 'bg-indigo-500', text: t('queue.status.inProgress'), icon: Play };
      case 'WAITING':
        return { color: 'bg-amber-500', text: t('queue.status.waiting'), icon: Clock };
      case 'COMPLETED':
        return { color: 'bg-emerald-500', text: t('queue.status.completed'), icon: CheckCircle2 };
      default:
        return { color: 'bg-gray-500', text: status, icon: AlertCircle };
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 dark:shadow-none overflow-hidden h-full">
      <CardHeader className="pb-2 border-b border-gray-50 dark:border-slate-800 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">
            {t('queue.title')}
          </CardTitle>
        </div>
        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-400 font-bold">
          {queue.filter(q => q.status === 'WAITING').length} {t('queue.waiting')}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-50 dark:divide-slate-800 max-h-[400px] overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {queue.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">{t('queue.empty')}</p>
              </div>
            ) : (
              queue.map((item, index) => {
                const config = getStatusConfig(item.status);
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-all group flex items-center gap-4"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 dark:from-blue-900/30 to-indigo-50 dark:to-indigo-900/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {item.patientName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${config.color} shadow-sm`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {item.patientName}
                        </h4>
                        <span className="text-[10px] font-medium text-gray-400">
                          {item.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                          {formatDoctorName(item.doctorName)}
                        </p>
                        <span className="text-[10px] text-gray-300">•</span>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-gray-300" />
                          <span className={`text-[10px] font-bold ${item.waitTime > 30 ? 'text-rose-500' : 'text-gray-400'}`}>
                            {t('queue.minWait', { n: item.waitTime })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg border border-transparent hover:border-gray-100 dark:hover:border-slate-700 shadow-sm transition-all">
                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </CardContent>
      <div className="p-3 bg-gray-50/50 dark:bg-slate-800/30 border-t border-gray-50 dark:border-slate-800">
        <button className="w-full py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm dark:hover:shadow-none hover:border-indigo-200 dark:hover:border-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-2">
          {t('queue.viewAll')}
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </Card>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
}
