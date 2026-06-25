"use client";

import { motion } from "framer-motion";
import { 
  History, 
  CreditCard, 
  Calendar, 
  UserPlus,
  ArrowRight,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations, useFormatter } from 'next-intl';

interface Activity {
  id: string;
  type: 'payment' | 'appointment' | 'patient';
  title: string;
  description: string;
  time: Date | string; // Fix: Support both Date and serialized string from Server Actions
}

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const t = useTranslations('dashboard');
  const format = useFormatter();

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment': return CreditCard;
      case 'appointment': return Calendar;
      case 'patient': return UserPlus;
      default: return History;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'payment': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      case 'appointment': return 'text-blue-500 bg-blue-50 border-blue-100';
      case 'patient': return 'text-indigo-500 bg-indigo-50 border-indigo-100';
      default: return 'text-gray-500 bg-gray-50 border-gray-100';
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-white overflow-hidden h-full">
      <CardHeader className="pb-2 border-b border-gray-50 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <History className="w-4 h-4 text-indigo-600" />
          </div>
          <CardTitle className="text-lg font-bold text-gray-800">
            {t('feed.title')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto custom-scrollbar">
          {activities.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">{t('feed.empty')}</p>
            </div>
          ) : (
            activities.map((activity, index) => {
              const Icon = getIcon(activity.type);
              const colorClasses = getColor(activity.type);
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-gray-50/50 transition-colors group relative"
                >
                  <div className="flex gap-4">
                    <div className={`p-2 h-fit rounded-xl border ${colorClasses}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-gray-900">
                          {activity.title}
                        </h4>
                        <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
                          <Clock className="w-2.5 h-2.5" />
                          {format.relativeTime(new Date(activity.time))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {activity.description}
                      </p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center">
                      <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-indigo-400" />
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </CardContent>
      <div className="p-3 bg-gray-50/50 border-t border-gray-50">
        <button className="w-full py-2 text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
          {t('feed.viewLog')}
        </button>
      </div>
    </Card>
  );
}
