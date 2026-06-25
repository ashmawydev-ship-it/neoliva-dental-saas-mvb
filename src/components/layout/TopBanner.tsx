"use client";

import { Search, Menu } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileSidebar } from "./MobileSidebar";
import { useTranslations } from "next-intl";
import { useLocale } from "@/hooks/useLocale";
import { formatDate } from "@/lib/format";

export function TopBanner({ 
  user,
  settings,
  locale
}: { 
  user?: any;
  settings?: { clinicName: string; logoUrl: string | null };
  locale?: string;
}) {
  const [searchFocused, setSearchFocused] = useState(false);
  const systemLocale = useLocale();
  const activeLocale = locale || systemLocale;
  const tDate = useTranslations("dateFormats");

  return (
    <header className="h-16 bg-card/80 backdrop-blur-xl border-b border-border/60 flex items-center justify-between px-4 md:px-6 z-10 sticky top-0">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden mr-2 text-muted-foreground h-10 w-10 rounded-md hover:bg-muted">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-none">
          <MobileSidebar settings={settings} />
        </SheetContent>
      </Sheet>

      {/* Search */}
      <div className={`flex items-center flex-1 max-w-lg transition-all duration-300 ${searchFocused ? "max-w-2xl" : ""}`}>
        <div className="relative w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
          <Input
            type="search"
            placeholder="Search patients, appointments..."
            className="w-full pl-10 h-10 bg-muted/80 border-border/60 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-300 focus-visible:bg-card transition-all placeholder:text-muted-foreground/70 text-foreground"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-4">
        <LanguageSwitcher />
        <ThemeToggle />
        <NotificationBell userId={user?.id} tenantId={user?.tenantId} />

        {/* Date */}
        <div className="hidden lg:flex items-center gap-2 ml-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-soft" />
          <span className="text-xs font-medium text-muted-foreground">
            {tDate("today", {
              date: formatDate(new Date(), activeLocale, {
                weekday: "short",
                month: "short",
                day: "numeric",
              }),
            })}
          </span>
        </div>
      </div>
    </header>
  );
}
