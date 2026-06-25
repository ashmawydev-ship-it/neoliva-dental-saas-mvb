"use client";

import { motion } from "framer-motion";
import { Plus, UserPlus, FileText, CalendarPlus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

export function QuickActions() {
  const router = useRouter();
  const t = useTranslations('dashboard');

  const actions = useMemo(() => [
    {
      label: t('quickActions.newPatient'),
      icon: UserPlus,
      color: "from-blue-500 to-blue-600",
      href: "/patients?action=new",
      shadow: "shadow-blue-200"
    },
    {
      label: t('quickActions.newAppointment'),
      icon: CalendarPlus,
      color: "from-indigo-500 to-indigo-600",
      href: "/appointments?action=new",
      shadow: "shadow-indigo-200"
    },
    {
      label: t('quickActions.createInvoice'),
      icon: FileText,
      color: "from-emerald-500 to-emerald-600",
      href: "/billing?action=new",
      shadow: "shadow-emerald-200"
    }
  ], [t]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {actions.map((action, i) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 + i * 0.1 }}
        >
          <Button
            onClick={() => router.push(action.href)}
            variant="outline"
            className="h-12 px-4 rounded-2xl border-gray-100 bg-white shadow-sm hover:shadow-xl hover:shadow-indigo-50 hover:border-indigo-100 transition-all duration-300 group overflow-hidden"
          >
            <div className={`p-1.5 rounded-xl bg-gradient-to-br ${action.color} text-white shadow-lg ${action.shadow} group-hover:scale-110 transition-transform`}>
              <action.icon className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-gray-700 text-xs ml-3">{action.label}</span>
            <ChevronRight className="w-3 h-3 ml-2 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
          </Button>
        </motion.div>
      ))}
      
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="w-10 h-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center hover:bg-black transition-colors shadow-lg"
      >
        <Plus className="w-5 h-5" />
      </motion.button>
    </div>
  );
}
