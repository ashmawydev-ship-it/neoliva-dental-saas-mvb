"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Package, Layers, Hash, AlertTriangle, Scale, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createItemAction } from "@/app/actions/inventory";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function NewInventoryItemDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createItemAction({
        name: formData.get('name') as string,
        category: formData.get('category') as string,
        unit: formData.get('unit') as string,
        initialStock: Number(formData.get('quantity') || 0),
        minimumStock: Number(formData.get('minLevel') || 0),
      });

      if (!result.success) {
        toast.error(result.error || "Failed to add inventory item");
      } else {
        toast.success("Inventory item added successfully");
        setOpen(false);
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to add inventory item");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 rounded-xl h-10 px-5 font-medium border-0">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md md:max-w-lg p-0 overflow-hidden bg-gray-50 border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="bg-white px-6 py-4 flex flex-row items-center justify-between border-b shrink-0 m-0 space-y-0">
          <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <span className="bg-blue-100 p-2 rounded-xl">
              <Package className="h-5 w-5 text-blue-600" />
            </span>
            Add Inventory Item
          </DialogTitle>
        </DialogHeader>

        <form 
          onSubmit={handleSubmit} 
          className="flex-1 flex flex-col overflow-hidden max-h-[80vh]"
        >
          <div className="flex-1 overflow-y-auto w-full p-6 space-y-5">
            
            {/* Item Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Item Name</Label>
              <Input 
                id="name"
                name="name"
                data-testid="item-name-input"
                placeholder="e.g. Lidocaine 2%" 
                className="bg-white border-gray-200 focus-visible:ring-blue-500 rounded-xl shadow-sm h-11" 
                required
              />
            </div>

            {/* Category & Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Category</Label>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <Select name="category" required>
                    <SelectTrigger data-testid="item-category-select" className="pl-10 bg-white border-gray-200 focus:ring-blue-500 rounded-xl shadow-sm h-11 w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Anesthetics">Anesthetics</SelectItem>
                      <SelectItem value="Materials">Materials</SelectItem>
                      <SelectItem value="Disposables">Disposables</SelectItem>
                      <SelectItem value="Preventive">Preventive</SelectItem>
                      <SelectItem value="Equipment">Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="unit" className="text-sm font-semibold text-gray-700">Unit Type</Label>
                <div className="relative">
                  <Scale className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <Select name="unit" required>
                    <SelectTrigger data-testid="item-unit-select" className="pl-10 bg-white border-gray-200 focus:ring-blue-500 rounded-xl shadow-sm h-11 w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vials">Vials</SelectItem>
                      <SelectItem value="Syringes">Syringes</SelectItem>
                      <SelectItem value="Boxes">Boxes</SelectItem>
                      <SelectItem value="Pcs">Pcs</SelectItem>
                      <SelectItem value="Bags">Bags</SelectItem>
                      <SelectItem value="Tubes">Tubes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Quantity & Min Level */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-semibold text-gray-700">Current Quantity</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    id="quantity"
                    name="quantity"
                    data-testid="item-quantity-input"
                    type="number"
                    placeholder="0" 
                    min="0"
                    className="pl-10 bg-white border-gray-200 focus-visible:ring-blue-500 rounded-xl shadow-sm h-11" 
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="minLevel" className="text-sm font-semibold text-gray-700">Minimum Level</Label>
                <div className="relative">
                  <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 text-amber-500" />
                  <Input 
                    id="minLevel"
                    name="minLevel"
                    data-testid="item-minlevel-input"
                    type="number"
                    placeholder="0" 
                    min="0"
                    className="pl-10 bg-white border-gray-200 focus-visible:ring-blue-500 rounded-xl shadow-sm h-11" 
                    required
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Alert threshold for low stock</p>
              </div>
            </div>

          </div>
          
          <DialogFooter className="bg-white px-6 py-4 border-t flex gap-3 shrink-0 w-full justify-end items-center">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
              className="px-6 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 h-11 shadow-sm font-medium"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              data-testid="submit-item-button"
              className="px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 h-11 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Item"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
