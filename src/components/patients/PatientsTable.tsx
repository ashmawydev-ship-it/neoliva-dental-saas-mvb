"use client";

import { useCallback, useRef, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { deletePatient } from "@/app/actions/patients";
import { toast } from "sonner";
import { Can } from "@/components/providers/permission-provider";
import { PermissionCode } from "@/types/permissions";
import { useState } from "react";

interface PatientTableProps {
  initialPatients: any[];
  total: number;
  totalPages: number;
  currentPage: number;
  currentSearch: string;
  searchPlaceholder?: string;
}

export function PatientsTable({
  initialPatients,
  total,
  totalPages,
  currentPage,
  currentSearch,
  searchPlaceholder,
}: PatientTableProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Debounce timer ref so rapid keystrokes don't flood the server
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Builds a new URLSearchParams string, preserving any unknown params
  const buildUrl = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(overrides).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      return `?${params.toString()}`;
    },
    [searchParams]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        router.push(buildUrl({ search: val, page: "1" }));
      });
    }, 450);
  };

  const goToPage = (page: number) => {
    startTransition(() => {
      router.push(buildUrl({ page: String(page) }));
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete patient ${name}? This action cannot be undone.`)) {
      return;
    }
    setIsDeleting(id);
    try {
      const res = await deletePatient(id);
      if (res.success) {
        toast.success("Patient deleted successfully");
        startTransition(() => router.refresh());
      } else {
        toast.error(res.error || "Failed to delete patient");
      }
    } catch (e) {
      toast.error("An unexpected error occurred");
      console.error(e);
    } finally {
      setIsDeleting(null);
    }
  };

  const startIndex = total === 0 ? 0 : (currentPage - 1) * 15 + 1;
  const endIndex   = Math.min(currentPage * 15, total);

  return (
    <>
      {/* Search input — controlled by URL, not local state */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="patients-search"
          placeholder={searchPlaceholder || "Search by name, phone, or ID..."}
          className="pl-10 h-10 rounded-xl bg-card border-border focus-visible:ring-blue-500/20 text-foreground placeholder:text-muted-foreground/70"
          defaultValue={currentSearch}
          onChange={handleSearchChange}
        />
      </div>

      <Card className="border-0 shadow-sm overflow-hidden mt-6 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/55 hover:bg-muted/55">
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Visit</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Next Appointment</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visits</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-right pr-6 text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {currentSearch ? `No patients found for "${currentSearch}"` : "No patients found"}
                </TableCell>
              </TableRow>
            ) : (
              initialPatients.map((patient) => (
                <TableRow key={patient.id} className="table-row-hover group border-border">
                  <TableCell>
                     <div className="flex items-center gap-3">
                       <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${patient.color || 'from-blue-500 to-indigo-600'} flex items-center justify-center text-white font-bold text-[10px] shadow-sm`}>
                         {patient.avatar}
                       </div>
                       <div>
                         <p className="text-sm font-semibold text-foreground">{patient.name}</p>
                         <p className="text-xs text-muted-foreground">{patient.displayId}</p>
                       </div>
                     </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{patient.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{patient.lastVisit}</TableCell>
                  <TableCell className="text-sm text-foreground font-medium">{patient.nextAppt}</TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold text-foreground">{patient.visits}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-semibold rounded-full px-2.5 border ${patient.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                          : "bg-muted text-muted-foreground border-border"
                        }`}
                    >
                      {patient.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/patients/${patient.id}`}>
                        <Button variant="ghost" size="sm" className="rounded-lg text-blue-600 hover:text-blue-700 hover:bg-muted text-xs h-8 px-2">
                          View <ExternalLink className="ml-1.5 w-3 h-3" />
                        </Button>
                      </Link>
                      <Can permission={PermissionCode.PATIENT_DELETE}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(patient.id, patient.name)}
                          disabled={isDeleting === patient.id}
                          className="rounded-lg text-rose-600 hover:text-rose-700 hover:bg-muted text-xs h-8 px-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </Can>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{startIndex}–{endIndex}</span> of{" "}
              <span className="font-medium text-foreground">{total}</span> patients
            </p>
            <div className="flex items-center gap-1">
              <Button
                id="patients-prev-page"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page number buttons — show at most 5 around current */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "…" ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-xs">…</span>
                  ) : (
                    <Button
                      key={item}
                      id={`patients-page-${item}`}
                      variant={item === currentPage ? "default" : "ghost"}
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg text-xs"
                      onClick={() => goToPage(item as number)}
                    >
                      {item}
                    </Button>
                  )
                )}

              <Button
                id="patients-next-page"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                disabled={currentPage >= totalPages}
                onClick={() => goToPage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

