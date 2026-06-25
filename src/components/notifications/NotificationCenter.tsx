"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Notification, NotificationType, NotificationPriority } from "@/generated/client";
import { getNotifications, markAllAsRead, archiveNotifications } from "@/app/actions/notifications";
import { NotificationItem } from "./NotificationItem";
import { Button } from "@/components/ui/button";
import { 
  CheckCheck, 
  Filter, 
  Loader2, 
  BellOff, 
  ChevronLeft, 
  ChevronRight,
  Inbox,
  AlertCircle,
  Archive,
  Settings2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function NotificationCenter() {
  const t = useTranslations('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    type?: NotificationType;
    priority?: NotificationPriority;
    isRead?: boolean;
    isArchived?: boolean;
  }>({ isRead: undefined, isArchived: false });
  const [page, setPage] = useState(0);
  const take = 10;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNotifications({
        ...filter,
        skip: page * take,
        take: take
      });
      if (res.success) {
        setNotifications(res.data as Notification[]);
      } else {
        setError(res.error || t('errors.loadFailed'));
      }
    } catch (err) {
      setError(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [filter, page, t]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    const res = await markAllAsRead();
    if (res.success) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success(t('toast.markAllReadSuccess') || "All notifications marked as read");
    }
  };

  const handleArchiveOld = async () => {
    const res = await archiveNotifications();
    if (res.success) {
      toast.success(t('toast.archiveOldSuccess') || "Old notifications moved to archive");
      fetchNotifications();
    }
  };

  const handleItemRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleItemArchive = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleItemDelete = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getTypeValue = (type: string) => {
    switch (type) {
      case 'APPOINTMENT': return t('filter.appointment');
      case 'BILLING': return t('filter.invoice');
      case 'INVENTORY': return t('filter.inventory');
      case 'LAB': return t('filter.lab');
      case 'SYSTEM': return t('filter.system');
      default: return type;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/settings/notifications">
            <Button variant="outline" size="sm" className="rounded-full h-10 border-slate-200">
              <Settings2 className="w-4 h-4 mr-2" />
              {t('settings')}
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleMarkAllRead}
            disabled={notifications.every(n => n.isRead) || loading}
            className="rounded-full h-10 px-5 border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <CheckCheck className="w-4 h-4 mr-2 text-green-500" />
            {t('actions.markAllRead')}
          </Button>
          {!filter.isArchived && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleArchiveOld}
              className="rounded-full h-10 border-slate-200 hover:bg-slate-50"
            >
              <Archive className="w-4 h-4 mr-2 text-slate-400" />
              {t('actions.archiveSelected')}
            </Button>
          )}
        </div>
      </div>

      {/* Filters & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-3">
          <Tabs 
            defaultValue="all" 
            className="w-[420px]"
            onValueChange={(v) => {
              if (v === "archived") setFilter(f => ({ ...f, isArchived: true, isRead: undefined }));
              else setFilter(f => ({ ...f, isArchived: false, isRead: v === "all" ? undefined : v === "unread" ? false : true }));
              setPage(0);
            }}
          >
            <TabsList className="bg-white border border-slate-200 p-1 rounded-full h-11">
              <TabsTrigger value="all" className="rounded-full data-[state=active]:bg-blue-600 data-[state=active]:text-white px-6 h-9">{t('tabs.all')}</TabsTrigger>
              <TabsTrigger value="unread" className="rounded-full data-[state=active]:bg-blue-600 data-[state=active]:text-white px-6 h-9">{t('tabs.unread')}</TabsTrigger>
              <TabsTrigger value="read" className="rounded-full data-[state=active]:bg-blue-600 data-[state=active]:text-white px-6 h-9">{t('tabs.read')}</TabsTrigger>
              <TabsTrigger value="archived" className="rounded-full data-[state=active]:bg-slate-800 data-[state=active]:text-white px-6 h-9">{t('tabs.archived')}</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select onValueChange={(v) => {
            setFilter(f => ({ ...f, type: v === "ALL" ? undefined : v as NotificationType }));
            setPage(0);
          }}>
            <SelectTrigger className="w-[180px] h-11 rounded-full bg-white border-slate-200 shadow-sm font-medium">
              <SelectValue placeholder={t('filter.allTypes')} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="ALL">{t('filter.allTypes')}</SelectItem>
              {Object.values(NotificationType).map(item => (
                <SelectItem key={item} value={item}>{getTypeValue(item)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={(v) => {
            setFilter(f => ({ ...f, priority: v === "ALL" ? undefined : v as NotificationPriority }));
            setPage(0);
          }}>
            <SelectTrigger className="w-[160px] h-11 rounded-full bg-white border-slate-200 shadow-sm font-medium">
              <SelectValue placeholder={t('filter.allPriorities')} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="ALL">{t('filter.allPriorities')}</SelectItem>
              {Object.values(NotificationPriority).map(p => (
                <SelectItem key={p} value={p}>{t(`priority.${p}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200">
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={page === 0 || loading}
            onClick={() => setPage(p => p - 1)}
            className="rounded-full hover:bg-slate-100 h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-bold text-slate-600 min-w-[60px] text-center uppercase tracking-wider">{t('pagination.page')} {page + 1}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={notifications.length < take || loading}
            onClick={() => setPage(p => p + 1)}
            className="rounded-full hover:bg-slate-100 h-8 w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main List Area */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 flex gap-4 animate-pulse">
              <Skeleton className="w-12 h-12 rounded-xl bg-slate-100" />
              <div className="flex-1 space-y-3 pt-1">
                <Skeleton className="h-5 w-1/3 bg-slate-100" />
                <Skeleton className="h-4 w-2/3 bg-slate-50" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="bg-white border border-red-100 p-12 rounded-[2rem] shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t('errors.loadFailed')}</h3>
            <p className="text-slate-500 mt-2 max-w-xs">{error}</p>
            <Button variant="outline" className="mt-8 rounded-full px-8 border-red-200 text-red-600 hover:bg-red-50" onClick={fetchNotifications}>
              {t('errors.tryAgain')}
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-100 p-20 rounded-[2.5rem] flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
              <Inbox className="w-12 h-12 text-slate-200" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{t('empty.title')}</h3>
            <p className="text-slate-500 mt-2 max-w-sm">
              {t('empty.subtitle')}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {notifications.map((n) => (
              <NotificationItem 
                key={n.id} 
                notification={n} 
                onRead={handleItemRead}
                onArchive={handleItemArchive}
                onDelete={handleItemDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
