"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package } from "lucide-react";
import { useTranslations } from "next-intl";

interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  minimumStock: number;
  category: string;
  unit: string;
}

export function ReportsInventoryAlerts({ items }: { items: InventoryItem[] }) {
  const t = useTranslations('reports');

  return (
    <Card className="border-0 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
      <CardHeader className="bg-red-50/50 dark:bg-red-500/10">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div>
            <CardTitle className="text-base font-semibold text-red-900 dark:text-red-400">{t('inventoryAlerts.title')}</CardTitle>
            <p className="text-xs text-red-600 dark:text-red-500">Items below minimum stock levels</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {items.length > 0 ? (
            items.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg">
                    <Package className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">{item.currentStock} {item.unit}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">/ min {item.minimumStock}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10">
                    Restock Required
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-gray-200 dark:text-slate-800 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('inventoryAlerts.noAlerts')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
