"use client"

import React, { useState } from "react";
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  Minus, 
  MoreVertical, 
  Search,
  ArrowUpRight,
  History,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { addStockAction, deductStockAction, deleteItemAction } from "@/app/actions/inventory";
import { toast } from "sonner";
import { NewInventoryItemDialog } from "./NewInventoryItemDialog";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minLevel: number;
  unit: string;
  status: 'Low' | 'OK';
  location?: string;
  lastUpdated: Date | null;
}

interface InventoryViewProps {
  initialItems: InventoryItem[];
  lowStockCount: number;
}

export default function InventoryView({ initialItems, lowStockCount }: InventoryViewProps) {
  const [items, setItems] = useState(initialItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdjusting, setIsAdjusting] = useState<string | null>(null);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdjustStock = async (id: string, adjustment: number) => {
    setIsAdjusting(id);
    const data = { itemId: id, quantity: Math.abs(adjustment), reason: adjustment > 0 ? "Manual Adjustment (In)" : "Manual Adjustment (Out)" };
    const result = adjustment > 0 
      ? await addStockAction(data)
      : await deductStockAction(data);
    
    if (result.success) {
      // Optimistically update or just wait for revalidation? 
      // For UX, let's update local state
      setItems(prev => prev.map(item => {
        if (item.id === id) {
          const newQty = Math.max(0, item.quantity + adjustment);
          return {
            ...item,
            quantity: newQty,
            status: newQty <= item.minLevel ? 'Low' : 'OK'
          };
        }
        return item;
      }));
      toast.success("Stock adjusted successfully");
    } else {
      toast.error(result.error || "Failed to adjust stock");
    }
    setIsAdjusting(null);
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Items</p>
            <h3 className="text-2xl font-bold text-gray-900">{items.length}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Low Stock Alerts</p>
            <h3 className="text-2xl font-bold text-gray-900">{lowStockCount}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <History className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Last Audit</p>
            <h3 className="text-2xl font-bold text-gray-900">Today</h3>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search by item name or category..." 
            className="pl-10 h-11 bg-white border-gray-200 rounded-xl focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none h-11 rounded-xl border-gray-200 hover:bg-gray-50">
            <Info className="w-4 h-4 mr-2" />
            Audit Report
          </Button>
          <NewInventoryItemDialog />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item Details</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors" data-testid={`inventory-row-${item.name.replace(/\s+/g, '-').toLowerCase()}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${item.status === 'Low' ? 'bg-red-50' : 'bg-blue-50'}`}>
                        <Package className={`w-4 h-4 ${item.status === 'Low' ? 'text-red-600' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900" data-testid="inventory-name">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.location || 'Main Storage'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                      {item.category}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-gray-900" data-testid="inventory-quantity">{item.quantity} {item.unit}</span>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleAdjustStock(item.id, -1)}
                          disabled={isAdjusting === item.id}
                          className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleAdjustStock(item.id, 1)}
                          disabled={isAdjusting === item.id}
                          className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge 
                      data-testid="inventory-status"
                      className={`
                        ${item.status === 'Low' 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        } border-none font-medium
                      `}
                    >
                      {item.status === 'Low' ? 'Low Stock' : 'In Stock'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl border-gray-100 shadow-xl">
                        <DropdownMenuItem className="text-gray-600">
                          <ArrowUpRight className="w-4 h-4 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-gray-600">
                          <History className="w-4 h-4 mr-2" /> View Logs
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onClick={() => deleteItemAction(item.id)}
                        >
                          Delete Item
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-4 bg-gray-50 rounded-full">
                        <Package className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-medium">No items found matching your search.</p>
                      <Button variant="link" className="text-blue-600" onClick={() => setSearchTerm("")}>
                        Clear search
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
