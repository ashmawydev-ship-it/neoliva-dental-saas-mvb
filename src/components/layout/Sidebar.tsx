"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Calendar, Users, Stethoscope,
  FileText, Package, UserCog, BarChart3, Settings,
  ChevronLeft, LogOut, Moon, Sun, Truck, Wallet, Loader2, DollarSign, Activity, DoorOpen, MessageSquareText
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

import { usePermission } from "@/components/providers/permission-provider";
import { PermissionCode } from "@/types/permissions";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  permission?: PermissionCode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function getNavGroups(tNav: any, tGroup: any): NavGroup[] {
  return [
    {
      label: tGroup("overview"),
      items: [
        { name: tNav("dashboard"), href: "/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: tGroup("clinical"),
      items: [
        { name: tNav("appointments"), href: "/appointments", icon: Calendar, permission: PermissionCode.APPOINTMENT_VIEW },
        { name: tNav("patients"), href: "/patients", icon: Users, permission: PermissionCode.PATIENT_VIEW },
        { name: tNav("services"), href: "/services", icon: Stethoscope, permission: PermissionCode.SETTINGS_SERVICES_MANAGE },
        { name: tNav("labOrders"), href: "/lab-orders", icon: Truck, permission: PermissionCode.CLINICAL_LAB_ORDER_MANAGE },
      ],
    },
    {
      label: tGroup("financial"),
      items: [
        { name: tNav("financialDashboard"), href: "/dashboard/finance", icon: DollarSign, permission: PermissionCode.FINANCE_VIEW },
        { name: tNav("billing"), href: "/billing", icon: FileText, permission: PermissionCode.BILLING_VIEW },
        { name: tNav("expenses"), href: "/expenses", icon: Wallet, permission: PermissionCode.BILLING_VIEW },
        { name: tNav("inventory"), href: "/inventory", icon: Package, permission: PermissionCode.INVENTORY_VIEW },
      ],
    },
    {
      label: tGroup("management"),
      items: [
        { name: tNav("rooms"), href: "/dashboard/rooms", icon: DoorOpen, permission: PermissionCode.ROOM_VIEW },
        { name: tNav("staff"), href: "/staff", icon: UserCog, permission: PermissionCode.STAFF_MANAGE },
        { name: tNav("reports"), href: "/reports", icon: BarChart3, permission: PermissionCode.STAFF_REPORTS_VIEW },
        { name: tNav("operations"), href: "/dashboard/operations", icon: Activity, permission: PermissionCode.ADMIN_FULL_ACCESS },
        { name: tNav("campaigns"), href: "/communications/campaigns", icon: MessageSquareText, permission: PermissionCode.STAFF_MANAGE },
        { name: tNav("smsTemplates"), href: "/settings/sms-templates", icon: MessageSquareText, permission: PermissionCode.SETTINGS_CLINIC_EDIT },
        { name: tNav("settings"), href: "/settings", icon: Settings, permission: PermissionCode.SETTINGS_CLINIC_EDIT },
      ],
    },
  ];
}

import { signOut } from "@/app/actions/signout";
import { toast } from "sonner";

interface SidebarProps {
  user?: {
    email: string;
    role: string;
    staff?: {
      name: string;
    } | null;
  };
  settings?: {
    clinicName: string;
    logoUrl: string | null;
  };
}

export function Sidebar({ user, settings }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { hasPermission, permissions } = usePermission();
  const locale = useLocale();
  const isRtl = locale === "ar";

  const tNav = useTranslations("nav");
  const tGroup = useTranslations("navGroups");
  const navGroups = getNavGroups(tNav, tGroup);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      // In Next.js, redirect() throws a special error. 
      // We should only catch actual errors.
      if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
        throw error;
      }
      console.error('Logout error:', error);
      toast.error("Failed to log out. Please try again.");
      setIsLoggingOut(false);
    }
  };

  const userName = user?.staff?.name || user?.email?.split('@')[0] || "User";
  const userRole = user?.role || "Staff";
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Filter groups and items based on permissions
  const filteredGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.permission || hasPermission(item.permission))
  })).filter(group => group.items.length > 0);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-full transition-all duration-300 ease-in-out relative z-20",
        "bg-sidebar text-white",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-5 h-16 border-b border-white/[0.06]",
        collapsed && "justify-center px-0"
      )}>
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Clinic Logo" className="w-full h-full object-cover" />
            ) : (
              <Stethoscope className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-sidebar animate-pulse-soft" />
        </div>
        {!collapsed && (
          <div className="animate-slide-in overflow-hidden">
            <h2 className="text-[15px] font-bold tracking-tight whitespace-nowrap">{settings?.clinicName || "SmileCare"}</h2>
            <p className="text-[10px] text-blue-300/70 font-medium tracking-widest uppercase">Pro Dashboard</p>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[68px] w-6 h-6 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center z-50 hover:scale-110 transition-transform sidebar-collapse-btn"
      >
        <ChevronLeft className={cn("w-3.5 h-3.5 text-gray-600 transition-transform duration-300", collapsed && (isRtl ? "-rotate-180" : "rotate-180"))} />
      </button>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6 scrollbar-none">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-blue-300/40 mb-2 px-3">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl transition-all duration-200",
                      collapsed ? "justify-center px-0 py-2.5 mx-auto w-11 h-11" : "px-3 py-2.5",
                      isActive
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-white/50 hover:text-white/90 hover:bg-white/[0.05]"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-400 rounded-full" />
                    )}
                    <item.icon className={cn(
                      "flex-shrink-0 transition-colors duration-200",
                      collapsed ? "w-5 h-5" : "w-[18px] h-[18px]",
                      isActive ? "text-blue-400" : "text-white/40 group-hover:text-white/70"
                    )} />
                    {!collapsed && (
                      <span className={cn(
                        "text-[13px] font-medium whitespace-nowrap",
                        isActive ? "text-white" : ""
                      )}>
                        {item.name}
                      </span>
                    )}
                    {isActive && !collapsed && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse-soft" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className={cn(
        "border-t border-white/[0.06] p-3",
        collapsed && "flex flex-col items-center"
      )}>
        {!collapsed ? (
          <div 
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] transition-all cursor-pointer group active:scale-95",
              isLoggingOut && "opacity-50 pointer-events-none"
            )}
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-lg">
                {initials}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-sidebar" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white/90 truncate">{userName}</p>
              <p className="text-[11px] text-white/40 truncate">{userRole}</p>
            </div>
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 text-white/25 group-hover:text-white/60 transition-colors flex-shrink-0" />
            )}
          </div>
        ) : (
          <div 
            onClick={handleLogout}
            className={cn(
              "w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-lg cursor-pointer hover:scale-110 transition-all active:scale-90",
              isLoggingOut && "opacity-50 animate-pulse"
            )}
          >
            {isLoggingOut ? "..." : initials}
          </div>
        )}
      </div>
    </aside>
  );
}
