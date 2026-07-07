"use client";

import { TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

interface ClickableTableRowProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function ClickableTableRow({ href, children, className }: ClickableTableRowProps) {
  const router = useRouter();
  
  return (
    <TableRow 
      className={`cursor-pointer ${className || ""}`}
      onClick={(e) => {
        // Prevent navigation if clicking on an interactive element like a button or link inside the row
        if (
          (e.target as HTMLElement).closest("button") || 
          (e.target as HTMLElement).closest("a") || 
          (e.target as HTMLElement).closest("[role='menuitem']")
        ) {
          return;
        }
        router.push(href);
      }}
    >
      {children}
    </TableRow>
  );
}
