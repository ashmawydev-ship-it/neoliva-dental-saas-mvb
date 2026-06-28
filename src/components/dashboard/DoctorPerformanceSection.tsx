"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, TrendingUp, Users } from "lucide-react";

interface DoctorPerformance {
  id: string;
  name: string;
  revenue: number;
  patientsCount: number;
  completionRate: number;
}

interface DoctorPerformanceSectionProps {
  doctors: DoctorPerformance[];
}

export function DoctorPerformanceSection({ doctors }: DoctorPerformanceSectionProps) {
  return (
    <Card className="border-0 shadow-sm dark:bg-slate-900 dark:shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-white">
          <Award className="w-4 h-4 text-blue-600" />
          Doctor Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {doctors.map((doc) => (
          <div key={doc.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400 uppercase font-semibold">
                    <Users className="w-3 h-3" /> {doc.patientsCount} patients
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 uppercase font-bold">
                    <TrendingUp className="w-3 h-3" /> ${doc.revenue.toLocaleString()}
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-600">{Math.round(doc.completionRate)}%</span>
            </div>
            <Progress value={doc.completionRate} className="h-1.5 dark:bg-slate-800" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
