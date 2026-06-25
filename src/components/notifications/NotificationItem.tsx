"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { 
  Calendar, 
  DollarSign, 
  Package, 
  FlaskConical, 
  Bell, 
  Check,
  ExternalLink,
  Circle,
  Archive,
  MoreVertical,
  Trash2
} from "lucide-react";
import { Notification, NotificationType, NotificationPriority } from "@/generated/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { markAsRead, archiveNotification, deleteNotification } from "@/app/actions/notifications";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useTranslations, useLocale } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotificationItemProps {
  notification: Notification;
  onRead?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  showMarkAsRead?: boolean;
}

const typeIcons: Record<NotificationType, React.ElementType> = {
  APPOINTMENT: Calendar,
  BILLING: DollarSign,
  INVENTORY: Package,
  LAB: FlaskConical,
  SYSTEM: Bell,
};

const priorityStyles: Record<NotificationPriority, string> = {
  LOW: "bg-slate-50 text-slate-600 border-slate-100",
  MEDIUM: "bg-blue-50 text-blue-600 border-blue-100",
  HIGH: "bg-amber-50 text-amber-600 border-amber-100",
  CRITICAL: "bg-red-50 text-red-600 border-red-100 animate-pulse-subtle",
};

export function NotificationItem({ 
  notification, 
  onRead, 
  onArchive,
  onDelete,
  showMarkAsRead = true 
}: NotificationItemProps) {
  const t = useTranslations('notifications');
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? ar : enUS;

  const Icon = typeIcons[notification.type] || Bell;
  const isArchived = !!notification.archivedAt;

  const handleMarkAsRead = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (notification.isRead || isArchived) return;

    const res = await markAsRead(notification.id);
    if (res.success) {
      onRead?.(notification.id);
    } else {
      toast.error(t('errors.loadFailed'));
    }
  };

  const handleArchive = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isArchived) return;

    const res = await archiveNotification(notification.id);
    if (res.success) {
      onArchive?.(notification.id);
    } else {
      toast.error(t('errors.loadFailed'));
    }
  };

  const handleDelete = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const res = await deleteNotification(notification.id);
    if (res.success) {
      onDelete?.(notification.id);
    } else {
      toast.error(t('errors.loadFailed'));
    }
  };

  return (
    <div 
      className={cn(
        "group relative flex items-start gap-5 p-5 rounded-2xl border transition-all duration-300",
        notification.isRead || isArchived 
          ? "bg-white border-slate-100 hover:border-slate-200" 
          : "bg-gradient-to-br from-blue-50/50 to-white border-blue-100 shadow-sm hover:shadow-md ring-1 ring-blue-50/50"
      )}
    >
      {/* Type Icon & State */}
      <div className="relative">
        <div className={cn(
          "p-3 rounded-xl border-2 transition-transform group-hover:scale-105 duration-300 shadow-sm",
          isArchived ? "bg-slate-50 border-slate-100 text-slate-400" : "bg-white border-slate-50 text-blue-600"
        )}>
          <Icon className="w-6 h-6" />
        </div>
        {!notification.isRead && !isArchived && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={cn(
              "text-base font-bold truncate tracking-tight",
              (notification.isRead || isArchived) ? "text-slate-600" : "text-slate-900"
            )}>
              {notification.title}
            </h4>
            <Badge variant="outline" className={cn(
              "text-[10px] font-bold uppercase tracking-widest px-2 py-0 h-4 border-2",
              priorityStyles[notification.priority]
            )}>
              {t(`priority.${notification.priority}`)}
            </Badge>
            {isArchived && (
              <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500 h-4 px-2 font-bold uppercase border-2 border-slate-200/50">
                {t('tabs.archived')}
              </Badge>
            )}
          </div>
          <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: dateLocale })}
          </span>
        </div>
        
        <p className={cn(
          "text-sm line-clamp-2 leading-relaxed transition-colors",
          (notification.isRead || isArchived) ? "text-slate-400" : "text-slate-600 font-medium"
        )}>
          {notification.message}
        </p>

        {/* Actions Bar */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            {notification.actionUrl && (
              <Link 
                href={notification.actionUrl}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-all hover:gap-2 px-3 py-1.5 bg-blue-50/50 rounded-full border border-blue-100/50"
              >
                {t('actionRequired')}
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}

            {!notification.isRead && !isArchived && showMarkAsRead && (
              <button 
                onClick={handleMarkAsRead}
                className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1.5 transition-all hover:bg-white px-3 py-1.5 rounded-full border border-transparent hover:border-slate-100"
              >
                <Check className="w-3.5 h-3.5" />
                {t('actions.markAsRead')}
              </button>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border border-slate-100 bg-white shadow-md p-1 min-w-[120px]">
                {!notification.isRead && !isArchived && (
                  <DropdownMenuItem 
                    onClick={handleMarkAsRead}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium cursor-pointer text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t('actions.markAsRead')}
                  </DropdownMenuItem>
                )}
                {!isArchived && (
                  <DropdownMenuItem 
                    onClick={handleArchive}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium cursor-pointer text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    {t('actions.archive')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  {t('actions.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
