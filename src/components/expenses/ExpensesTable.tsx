"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { useState } from "react";
import { ExpenseRowActions } from "./ExpenseClientActions";

export function ExpensesTable({ initialExpenses }: { initialExpenses: any[] }) {
  const t = useTranslations('expenses');
  const [search, setSearch] = useState("");

  const filteredExpenses = (initialExpenses || []).filter(e => {
    if (!e) return false;
    const searchLower = (search || "").toLowerCase();
    
    const title = String(e.title || "").toLowerCase();
    const description = String(e.description || "").toLowerCase();
    const category = String(e.category || "").toLowerCase();

    return (
      title.includes(searchLower) ||
      description.includes(searchLower) ||
      category.includes(searchLower)
    );
  });

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
          />
        </div>
      </div>
      <Table>
        <TableHeader className="bg-gray-50/50">
          <TableRow className="border-b-gray-100 hover:bg-transparent">
            <TableHead className="font-semibold text-gray-500 uppercase text-xs tracking-wider">{t('table.date')}</TableHead>
            <TableHead className="font-semibold text-gray-500 uppercase text-xs tracking-wider">{t('table.category')}</TableHead>
            <TableHead className="font-semibold text-gray-500 uppercase text-xs tracking-wider">{t('table.description')}</TableHead>
            <TableHead className="font-semibold text-gray-500 uppercase text-xs tracking-wider">{t('table.amount')}</TableHead>
            <TableHead className="font-semibold text-gray-500 uppercase text-xs tracking-wider">{t('table.status')}</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredExpenses.map((expense) => (
            <TableRow key={expense.id} className="border-b-gray-50 hover:bg-red-50/30 transition-colors group">
              <TableCell className="font-medium text-gray-900 text-sm">
                {new Date(expense.date).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 rounded-full font-medium shadow-sm capitalize">
                  {t.has(`categories.${expense.category}`) ? t(`categories.${expense.category}`) : expense.category}
                </Badge>
              </TableCell>
              <TableCell className="text-gray-600">
                <span className="block font-semibold text-gray-900">{expense.title}</span>
                {expense.description && <span className="block text-xs text-gray-500">{expense.description}</span>}
                <span className="text-[10px] text-gray-400 font-mono mt-0.5">{expense.id.toString().substring(0, 8)}</span>
              </TableCell>
              <TableCell className="font-bold text-gray-900">
                {expense.amountFormatted || `$${Number(expense.amount).toFixed(2)}`}
              </TableCell>
              <TableCell>
                <Badge
                  className={`rounded-full shadow-sm font-semibold border-none ${
                    expense.status?.toUpperCase() === "PAID" 
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" 
                      : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                  }`}
                >
                  {t(`status.${expense.status?.toUpperCase() || 'PENDING'}`)}
                </Badge>
              </TableCell>
              <TableCell>
                <ExpenseRowActions expense={expense} />
              </TableCell>
            </TableRow>
          ))}
          {filteredExpenses.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-gray-500 font-medium bg-gray-50/30">
                {t('dialog.noExpensesFound')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
