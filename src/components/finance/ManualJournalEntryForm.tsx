"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, BookOpen, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { manualJournalEntryAction } from "@/app/actions/treasury";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function ManualJournalEntryForm() {
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
        router.push("/dashboard/finance");
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/finance">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              New Journal Entry
            </h1>
            <p className="text-gray-500">Create a manual double-entry ledger record.</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="reference" className="text-sm font-semibold">Reference</Label>
                <Input 
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. JE-2023-001" 
                  className="h-11 rounded-xl"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                <Input 
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Reason for entry" 
                  className="h-11 rounded-xl"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t dark:border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Ledger Lines</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-8 rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                  <Plus className="h-4 w-4 mr-1" /> Add Line
                </Button>
              </div>

              <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-800/50">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Account</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 w-32">Debit</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 w-32">Credit</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-800">
                    {lines.map((line, index) => (
                      <tr key={index}>
                        <td className="p-2">
                          <Input 
                            value={line.accountName} 
                            onChange={(e) => updateLine(index, "accountName", e.target.value)}
                            placeholder="Account Name"
                            className="h-10 border-0 bg-gray-50 dark:bg-slate-800/50 focus-visible:ring-1"
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
                            className="h-10 border-0 bg-gray-50 dark:bg-slate-800/50 focus-visible:ring-1"
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
                            className="h-10 border-0 bg-gray-50 dark:bg-slate-800/50 focus-visible:ring-1"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" 
                            onClick={() => removeLine(index)}
                            disabled={lines.length <= 2}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                    <tr>
                      <td className="px-4 py-4 text-right font-semibold text-gray-600 dark:text-gray-300">Total</td>
                      <td className={`px-4 py-4 font-bold ${isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{totalDebit.toFixed(2)}</td>
                      <td className={`px-4 py-4 font-bold ${isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{totalCredit.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {!isBalanced && (
                <p className="text-sm text-red-500 font-medium flex items-center gap-1.5 mt-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  Debits and credits must be equal to submit.
                </p>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-slate-800/50 px-6 py-4 border-t dark:border-slate-800 flex justify-end gap-3">
            <Link href="/dashboard/finance">
              <Button 
                type="button" 
                variant="outline" 
                disabled={loading}
                className="px-6 rounded-xl h-11 font-medium bg-white dark:bg-slate-900"
              >
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={loading || !isBalanced}
              className="px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 h-11 font-semibold"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Post Entry
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
