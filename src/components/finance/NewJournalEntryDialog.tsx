"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, BookOpen, Trash2, Loader2 } from "lucide-react";
import { manualJournalEntryAction } from "@/app/actions/treasury";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function NewJournalEntryDialog({ customTrigger }: { customTrigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<{ accountName: string; debit: number; credit: number }[]>([
    { accountName: "", debit: 0, credit: 0 },
    { accountName: "", debit: 0, credit: 0 },
  ]);

  const addLine = () => {
    setLines([...lines, { accountName: "", debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: "accountName" | "debit" | "credit", value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const totalDebit = lines.reduce((acc, line) => acc + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((acc, line) => acc + (Number(line.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      toast.error("Debits and Credits must be equal and greater than 0");
      return;
    }
    
    setLoading(true);
    try {
      const result = await manualJournalEntryAction({
        description,
        reference,
        lines: lines.map(l => ({
          accountName: l.accountName,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
      });
      
      if (!result?.error) {
        toast.success("Journal Entry created successfully");
        setOpen(false);
        // Reset form
        setDescription("");
        setReference("");
        setLines([
          { accountName: "", debit: 0, credit: 0 },
          { accountName: "", debit: 0, credit: 0 },
        ]);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {customTrigger || (
          <Button variant="outline" className="text-gray-700 rounded-xl shadow-sm px-5 h-10 font-medium">
            <BookOpen className="mr-2 h-4 w-4" /> Journal Entry
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-gray-50 dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
        <DialogHeader className="bg-white dark:bg-slate-800 px-6 py-4 flex flex-row items-center justify-between border-b dark:border-slate-700 shrink-0 m-0 space-y-0">
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <span className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </span>
            New Journal Entry
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden max-h-[80vh]">
          <div className="flex-1 overflow-y-auto w-full p-6 space-y-5">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reference</Label>
                <Input 
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. JE-2023-001" 
                  className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 rounded-xl shadow-sm h-11 dark:text-white" 
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</Label>
                <Input 
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Reason for entry" 
                  className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 rounded-xl shadow-sm h-11 dark:text-white" 
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ledger Lines</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addLine} className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Plus className="h-4 w-4 mr-1" /> Add Line
                </Button>
              </div>

              <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Account</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 w-32">Debit</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 w-32">Credit</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-slate-700/50 last:border-0">
                        <td className="p-2">
                          <Input 
                            value={line.accountName} 
                            onChange={(e) => updateLine(index, "accountName", e.target.value)}
                            placeholder="Account Name"
                            className="h-9 border-0 bg-transparent shadow-none"
                            required
                          />
                        </td>
                        <td className="p-2">
                          <Input 
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.debit || ""} 
                            onChange={(e) => updateLine(index, "debit", e.target.value)}
                            placeholder="0.00"
                            className="h-9 border-0 bg-transparent shadow-none"
                          />
                        </td>
                        <td className="p-2">
                          <Input 
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.credit || ""} 
                            onChange={(e) => updateLine(index, "credit", e.target.value)}
                            placeholder="0.00"
                            className="h-9 border-0 bg-transparent shadow-none"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-400 hover:text-red-500" 
                            onClick={() => removeLine(index)}
                            disabled={lines.length <= 2}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700">
                    <tr>
                      <td className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Total</td>
                      <td className={`px-4 py-3 font-semibold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>{totalDebit.toFixed(2)}</td>
                      <td className={`px-4 py-3 font-semibold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>{totalCredit.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {!isBalanced && (
                <p className="text-xs text-red-500 font-medium">Debits and credits must be equal to submit.</p>
              )}
            </div>

          </div>
          
          <DialogFooter className="bg-white dark:bg-slate-800 px-6 py-4 border-t dark:border-slate-700 flex gap-3 shrink-0 w-full justify-end items-center">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
              className="px-6 rounded-xl h-11 font-medium"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !isBalanced}
              className="px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 h-11 font-semibold"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
