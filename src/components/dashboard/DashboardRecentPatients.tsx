"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Activity as ActivityIcon } from "lucide-react";

export function DashboardRecentPatients({ patients }: { patients: any[] }) {
  return (
    <Card className="lg:col-span-3 border-0 shadow-sm dark:bg-slate-900 dark:shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Today&apos;s Patient Queue</CardTitle>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Live patient status tracker</p>
        </div>
        <Link href="/patients">
          <Button variant="outline" size="sm" className="rounded-lg text-xs h-8">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {patients.length > 0 ? (
            patients.map((patient: any, i: number) => (
              <Link
                key={i}
                href={`/patients/${patient.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${patient.color} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
                    {patient.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{patient.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{patient.treatment}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-medium text-gray-600 dark:text-slate-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {patient.time}
                    </p>
                  </div>
                  <Badge
                    className={`text-[10px] font-semibold rounded-full px-2.5 border-none ${
                      patient.status === "IN_PROGRESS"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : patient.status === "WAITING"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {patient.status === "IN_PROGRESS" && <ActivityIcon className="w-2.5 h-2.5 mr-1 animate-pulse" />}
                    {patient.status}
                  </Badge>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">
              No patients scheduled for today.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
