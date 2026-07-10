'use client'

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { 
  Package, 
  AlertTriangle, 
  History, 
  Plus, 
  Minus, 
  Search, 
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  MoreVertical,
  PlusCircle,
  FileClock,
  Edit,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  createItemAction, 
  addStockAction, 
  deductStockAction, 
  getInventoryAction,
  getItemHistoryAction,
  updateItemAction,
  deleteItemAction
} from "@/app/actions/inventory";

interface InventoryClientProps {
  initialItems: any[];
  initialStats: any;
}

export function InventoryClient({ initialItems, initialStats }: InventoryClientProps) {
  const t = useTranslations('inventory');
  const [items, setItems] = useState(initialItems);
  const [stats, setStats] = useState(initialStats);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [stockModal, setStockModal] = useState<{ open: boolean, item: any, type: 'IN' | 'OUT' | 'HISTORY' | 'EDIT' | null }>({
    open: false,
    item: null,
    type: null
  });

  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Categories derived from items
  const categories = useMemo(() => {
    const cats = new Set(initialItems.map(i => i.category));
    return ['all', ...Array.from(cats)];
  }, [initialItems]);

  const fetchInventory = async () => {
    setLoading(true);
    const res = await getInventoryAction({ search, category });
    if (res.success && res.data) {
      setItems(res.data.items);
      setStats(res.data.stats);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, category]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (showLowStockOnly) {
      result = result.filter(item => item.currentStock <= item.minimumStock);
    }
    return result;
  }, [items, showLowStockOnly]);

  const handleStockAction = async (formData: FormData) => {
    const quantity = parseInt(formData.get("quantity") as string);
    const reason = formData.get("reason") as string;
    
    if (!stockModal.item) return;

    setLoading(true);
    try {
      let res;
      if (stockModal.type === 'IN') {
        res = await addStockAction({ itemId: stockModal.item.id, quantity, reason });
      } else {
        res = await deductStockAction({ itemId: stockModal.item.id, quantity, reason });
      }

      if (res?.success) {
        const message = stockModal.type === 'IN'
          ? t('toast.stockAdded', { quantity, unit: stockModal.item.unit, name: stockModal.item.name })
          : t('toast.stockDeducted', { quantity, unit: stockModal.item.unit, name: stockModal.item.name });
        toast.success(message);
        setStockModal({ open: false, item: null, type: null });
        fetchInventory();
      } else {
        toast.error(res?.error || t('toast.error'));
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('toast.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (formData: FormData) => {
    const name = formData.get("name") as string;
    const categoryName = formData.get("category") as string;
    const unit = formData.get("unit") as string;
    const minimumStock = parseInt(formData.get("minimumStock") as string);
    const initialStock = parseInt(formData.get("initialStock") as string) || 0;

    setLoading(true);
    const res = await createItemAction({ name, category: categoryName, unit, minimumStock, initialStock });
    
    if (res.success) {
      toast.success(t('toast.itemCreated'));
      setIsAddItemOpen(false);
      fetchInventory();
    } else {
      toast.error(res.error || t('toast.error'));
    }
    setLoading(false);
  };

  const fetchHistory = async (itemId: string) => {
    setHistoryLoading(true);
    const res = await getItemHistoryAction(itemId);
    if (res.success) {
      setHistory(res.data);
    }
    setHistoryLoading(false);
  };

  const handleUpdateItem = async (formData: FormData) => {
    if (!stockModal.item) return;
    
    const name = formData.get("name") as string;
    const categoryName = formData.get("category") as string;
    const unit = formData.get("unit") as string;
    const minimumStock = parseInt(formData.get("minimumStock") as string);

    setLoading(true);
    const res = await updateItemAction(stockModal.item.id, { name, category: categoryName, unit, minimumStock });
    
    if (res.success) {
      toast.success(t('toast.itemUpdated'));
      setStockModal({ open: false, item: null, type: null });
      fetchInventory();
    } else {
      toast.error(res.error || t('toast.error'));
    }
    setLoading(false);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm(t('dialog.confirmDelete'))) return;

    setLoading(true);
    const res = await deleteItemAction(id);
    
    if (res.success) {
      toast.success(t('toast.itemDeleted'));
      fetchInventory();
    } else {
      toast.error(res.error || t('toast.error'));
    }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setIsAddItemOpen(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('addItem')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20 shadow-none overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Package size={80} />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">{t('stats.totalItems')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalItems}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('stats.totalItemsDesc')}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className={`bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 shadow-none overflow-hidden relative group ${stats.lowStockAlerts > 0 ? 'ring-1 ring-amber-500/50' : ''}`}>
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <AlertTriangle size={80} />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">{t('stats.lowStockAlerts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.lowStockAlerts}</div>
              <Badge variant={stats.lowStockAlerts > 0 ? "destructive" : "secondary"} className="mt-1">
                {stats.lowStockAlerts > 0 ? t('stats.actionRequired') : t('stats.allGood')}
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 shadow-none overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <History size={80} />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t('stats.lastAudit')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-ellipsis truncate">{stats.lastAuditDate}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('stats.lastAuditDesc')}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters & Table */}
      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={t('search')} 
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter size={14} />
                <span>{t('table.category')}:</span>
              </div>
              <Select value={category} onValueChange={(val) => setCategory(val ?? 'all')}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder={t('filter.all')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat === 'all' ? t('filter.all') : (cat.charAt(0).toUpperCase() + cat.slice(1))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant={showLowStockOnly ? "destructive" : "outline"} 
                size="sm"
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className="gap-2"
              >
                <AlertTriangle size={14} />
                {t('filter.lowStockOnly')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[30%]">{t('table.item')}</TableHead>
                <TableHead>{t('table.category')}</TableHead>
                <TableHead className="text-center">{t('table.stock')}</TableHead>
                <TableHead className="text-center">{t('table.status')}</TableHead>
                <TableHead className="text-right">{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {loading && items.length === 0 ? (
                   [1,2,3,4,5].map(i => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}><div className="h-12 w-full animate-pulse bg-muted rounded-md" /></TableCell>
                    </TableRow>
                   ))
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3 opacity-50">
                        <Package size={48} className="text-muted-foreground" />
                        <div className="text-lg font-medium">{t('dialog.noItemsFound')}</div>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          {showLowStockOnly 
                            ? t('dialog.allStocked')
                            : t('dialog.adjustFilters')}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item, idx) => (
                    <motion.tr 
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      className="group hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-background border shadow-sm group-hover:scale-110 transition-transform ${item.currentStock <= item.minimumStock ? 'text-amber-500' : 'text-blue-500'}`}>
                            <Package size={16} />
                          </div>
                          <div>
                            <div>{item.name}</div>
                            <div className="text-xs text-muted-foreground font-normal">{t('table.minLevel')}: {item.minimumStock} {item.unit}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-background/50">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-lg font-bold ${item.currentStock <= item.minimumStock ? 'text-amber-600' : 'text-primary'}`}>
                            {item.currentStock}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{item.unit}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.currentStock <= item.minimumStock ? (
                          <Badge variant="warning" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
                             {t('status.lowStock')}
                          </Badge>
                        ) : (
                          <Badge variant="success" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                             {t('status.ok')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => setStockModal({ open: true, item, type: 'IN' })}
                            title={t('actions.addStock')}
                           >
                            <Plus size={16} />
                           </Button>
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => setStockModal({ open: true, item, type: 'OUT' })}
                            title={t('actions.deductStock')}
                           >
                            <Minus size={16} />
                           </Button>
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            onClick={() => {
                              setStockModal({ open: true, item, type: 'HISTORY' });
                              fetchHistory(item.id);
                            }}
                            title={t('actions.viewHistory')}
                           >
                            <FileClock size={16} />
                           </Button>
                           
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setStockModal({ open: true, item, type: 'EDIT' })}>
                                <Edit className="mr-2 h-4 w-4" />
                                {t('actions.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-rose-600 focus:text-rose-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('actions.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                           </DropdownMenu>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Item Modal */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary/5 p-6 pb-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary text-primary-foreground">
                  <PlusCircle size={24} />
                </div>
                {t('dialog.addItem')}
              </DialogTitle>
            </DialogHeader>
          </div>
          <form action={handleAddItem} className="p-6 pt-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('table.item')}</label>
                <Input name="name" placeholder={t('form.namePlaceholder')} required className="h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('table.category')}</label>
                <Input name="category" placeholder={t('form.categoryPlaceholder')} required className="h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('table.unit')}</label>
                <Input name="unit" placeholder={t('form.unitPlaceholder')} required className="h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('table.minLevel')}</label>
                <Input name="minimumStock" type="number" min="0" defaultValue="10" required className="h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('form.initialStock')}</label>
                <Input name="initialStock" type="number" min="0" defaultValue="0" className="h-11" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddItemOpen(false)}>{t('form.cancel')}</Button>
              <Button type="submit" disabled={loading}>
                {loading ? t('form.creating') : t('addItem')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock IN/OUT Modal */}
      <Dialog 
        open={stockModal.open && (stockModal.type === 'IN' || stockModal.type === 'OUT')} 
        onOpenChange={(open) => !open && setStockModal({ ...stockModal, open: false })}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {stockModal.type === 'IN' ? (
                <>
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600"><ArrowUpRight size={20} /></div>
                  <span>{t('dialog.addStock')}: {stockModal.item?.name}</span>
                </>
              ) : (
                <>
                  <div className="p-2 rounded-lg bg-rose-100 text-rose-600"><ArrowDownLeft size={20} /></div>
                  <span>{t('dialog.deductStock')}: {stockModal.item?.name}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <form action={handleStockAction} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">{t('form.quantity')} ({stockModal.item?.unit})</label>
              <Input name="quantity" type="number" min="1" required className="h-11" data-testid="quantity-input" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">{t('form.reason')}</label>
              <Input 
                name="reason" 
                placeholder={stockModal.type === 'IN' ? t('form.reasonPlaceholderIn') : t('form.reasonPlaceholderOut')} 
                required 
                className="h-11" 
                data-testid="reason-input"
              />
            </div>
            {stockModal.type === 'OUT' && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <AlertTriangle size={10} className="text-amber-500" />
                {t('form.availableStock', { stock: stockModal.item?.currentStock, unit: stockModal.item?.unit })}
              </p>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" data-testid="cancel-stock-button" onClick={() => setStockModal({ ...stockModal, open: false })}>{t('form.cancel')}</Button>
              <Button 
                type="submit" 
                disabled={loading}
                data-testid="submit-stock-button"
                className={stockModal.type === 'IN' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
              >
                {loading ? t('form.processing') : stockModal.type === 'IN' ? t('actions.addStock') : t('actions.deductStock')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog 
        open={stockModal.open && stockModal.type === 'HISTORY'} 
        onOpenChange={(open) => !open && setStockModal({ ...stockModal, open: false })}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col p-0">
          <div className="p-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                  <FileClock size={24} />
                </div>
                <div>
                  <div className="text-xl font-bold">{t('dialog.viewHistory')}</div>
                  <div className="text-sm text-muted-foreground font-normal">{stockModal.item?.name}</div>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="flex-1 overflow-y-auto p-0">
            {historyLoading ? (
               <div className="p-12 text-center"><div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>
            ) : history.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">{t('dialog.noHistory')}</div>
            ) : (
              <div className="divide-y">
                {history.map((entry) => (
                  <div key={entry.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${entry.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {entry.type === 'IN' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{entry.reason}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString('en-US', { 
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${entry.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {entry.type === 'IN' ? '+' : '-'}{entry.quantity}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 border-t bg-muted/20 flex justify-end">
            <Button variant="outline" onClick={() => setStockModal({ ...stockModal, open: false })}>{t('form.close')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Modal */}
      <Dialog 
        open={stockModal.open && stockModal.type === 'EDIT'} 
        onOpenChange={(open) => !open && setStockModal({ ...stockModal, open: false })}
      >
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-indigo-500/5 p-6 pb-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500 text-white">
                  <Edit size={24} />
                </div>
                {t('actions.edit')}: {stockModal.item?.name}
              </DialogTitle>
            </DialogHeader>
          </div>
          <form action={handleUpdateItem} className="p-6 pt-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('table.item')}</label>
                <Input name="name" defaultValue={stockModal.item?.name} required className="h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('table.category')}</label>
                <Input name="category" defaultValue={stockModal.item?.category} required className="h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('table.unit')}</label>
                <Input name="unit" defaultValue={stockModal.item?.unit} required className="h-11" />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-semibold text-foreground">{t('table.minLevel')}</label>
                <Input name="minimumStock" type="number" min="0" defaultValue={stockModal.item?.minimumStock} required className="h-11" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setStockModal({ ...stockModal, open: false })}>{t('form.cancel')}</Button>
              <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                {loading ? t('form.updating') : t('form.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
