export const dynamic = "force-dynamic";

import { getInventoryAction } from "@/app/actions/inventory";
import { InventoryClient } from "./inventory-client";

export const metadata = {
  title: 'Inventory Management | Neoliva Dashboard',
  description: 'Manage clinic supplies and track stock history.',
};

export default async function InventoryPage() {
  const result = await getInventoryAction();
  
  const initialData = (result.success && result.data) ? result.data : { items: [], stats: { totalItems: 0, lowStockAlerts: 0, lastAuditDate: '—' } };

  return (
    <div className="flex flex-col h-full bg-background/50">
      <InventoryClient 
        initialItems={initialData.items} 
        initialStats={initialData.stats} 
      />
    </div>
  );
}
