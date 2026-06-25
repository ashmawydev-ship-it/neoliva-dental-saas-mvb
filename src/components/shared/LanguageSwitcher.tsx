"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { setLocaleAction } from "@/app/actions/locale";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleLanguageChange = (newLocale: "en" | "ar") => {
    if (newLocale === locale) return;
    startTransition(async () => {
      await setLocaleAction(newLocale);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-1 bg-muted/85 p-0.5 rounded-xl border border-border/40">
      <Button
        variant={locale === "en" ? "secondary" : "ghost"}
        size="sm"
        disabled={isPending}
        onClick={() => handleLanguageChange("en")}
        className={cn(
          "h-7 rounded-lg px-2.5 text-xs font-semibold cursor-pointer transition-all duration-200",
          locale === "en"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-transparent"
        )}
      >
        EN
      </Button>
      <Button
        variant={locale === "ar" ? "secondary" : "ghost"}
        size="sm"
        disabled={isPending}
        onClick={() => handleLanguageChange("ar")}
        className={cn(
          "h-7 rounded-lg px-2.5 text-xs font-semibold cursor-pointer transition-all duration-200",
          locale === "ar"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-transparent"
        )}
      >
        AR
      </Button>
    </div>
  );
}
