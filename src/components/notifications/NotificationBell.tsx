"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, Loader2, Inbox } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getNotifications, getUnreadCount, markAllAsRead } from "@/app/actions/notifications";
import { Notification } from "@/generated/client";
import { NotificationItem } from "./NotificationItem";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationBellProps {
  userId?: string;
  tenantId?: string;
}

export function NotificationBell({ userId, tenantId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [count, res] = await Promise.all([
        getUnreadCount(),
        getNotifications({ take: 5 })
      ]);
      
      setUnreadCount(count);
      if (res.success) {
        setRecentNotifications(res.data as Notification[]);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();

    if (!userId) return;

    const supabase = createClient();
    
    // Subscribe to NEW notifications for this user
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setRecentNotifications(prev => [newNotification, ...prev].slice(0, 5));
          setUnreadCount(prev => prev + 1);
          // Optional: browser notification or sound
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          if (updated.isRead) {
            setRecentNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
            // Recalculate count if it was unread
            fetchInitialData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchInitialData]);

  // Handle Alt+T keyboard shortcut to toggle notifications
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMarkAllRead = async () => {
    const res = await markAllAsRead();
    if (res.success) {
      setUnreadCount(0);
      setRecentNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const handleItemRead = (id: string) => {
    setRecentNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          id="notifications-trigger"
          aria-label="Notifications"
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-slate-100 rounded-full w-10 h-10 transition-all active:scale-95"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5"
              >
                <Badge 
                  className="min-w-[18px] h-[18px] flex items-center justify-center p-0 bg-blue-600 hover:bg-blue-700 border-2 border-white text-[10px] font-bold"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[380px] p-0 rounded-2xl shadow-2xl border-slate-100 overflow-hidden mt-2">
        <div className="p-4 bg-white border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
            <p className="text-[11px] text-slate-400 font-medium">{unreadCount} unread messages</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-3 rounded-full"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
            Mark all read
          </Button>
        </div>

        <ScrollArea className="h-[320px]">
          <div className="p-2 space-y-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-32 gap-3">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                <span className="text-xs text-slate-400 font-medium">Updating alerts...</span>
              </div>
            ) : recentNotifications.length > 0 ? (
              recentNotifications.map((n) => (
                <NotificationItem 
                  key={n.id} 
                  notification={n} 
                  onRead={handleItemRead}
                  showMarkAsRead={false}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Inbox className="w-8 h-8 text-slate-200" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">All caught up!</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px]">No recent notifications to show.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DropdownMenuSeparator className="m-0" />
        
        <div className="p-3 bg-slate-50/50">
          <Link href="/notifications" onClick={() => setIsOpen(false)}>
            <Button 
              variant="outline" 
              className="w-full bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 h-10 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              See all notifications
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
