"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const RevenueChart = dynamic(
  () => import("./RevenueChart").then((mod) => mod.RevenueChart),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[350px] flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-1/3 bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-8 w-24 bg-slate-200 dark:bg-slate-700" />
        </div>
        <Skeleton className="flex-1 w-full bg-slate-200 dark:bg-slate-700" />
      </div>
    )
  }
);

export const TopServicesChart = dynamic(
  () => import("./TopServicesChart").then((mod) => mod.TopServicesChart),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[300px] flex flex-col gap-4">
        <Skeleton className="h-6 w-1/2 bg-slate-200 dark:bg-slate-700" />
        <Skeleton className="flex-1 w-full bg-slate-200 dark:bg-slate-700" />
      </div>
    )
  }
);

export const RevenueByDoctorChart = dynamic(
  () => import("./RevenueByDoctorChart").then((mod) => mod.RevenueByDoctorChart),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[300px] flex flex-col gap-4">
        <Skeleton className="h-6 w-1/2 bg-slate-200 dark:bg-slate-700" />
        <Skeleton className="flex-1 w-full bg-slate-200 dark:bg-slate-700" />
      </div>
    )
  }
);
