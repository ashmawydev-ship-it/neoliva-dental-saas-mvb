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
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="bg-red-50/50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div>
            <CardTitle className="text-base font-semibold text-red-900">{t('inventoryAlerts.title')}</CardTitle>
            <p className="text-xs text-red-600">Items below minimum stock levels</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {items.length > 0 ? (
            items.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Package className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-red-600">{item.currentStock} {item.unit}</span>
                    <span className="text-[10px] text-gray-400">/ min {item.minimumStock}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-red-200 text-red-600 bg-red-50">
                    Restock Required
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">{t('inventoryAlerts.noAlerts')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
