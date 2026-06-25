export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DollarSign, CreditCard, ArrowDownRight,
  TrendingUp, Receipt
} from "lucide-react";
import Link from "next/link";
import { getInvoices, getBillingStats } from "@/app/actions/billing";
import { NewInvoiceDialog } from "@/components/billing/NewInvoiceDialog";
import { ExportCSVButton, InvoiceRowActions } from "@/components/billing/BillingClientActions";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { formatDate } from "@/lib/format";

export default async function BillingPage() {
  const [transactions, stats] = await Promise.all([
    getInvoices(),
    getBillingStats()
  ]);

  const t = await getTranslations('billing');
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value || "en";

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/billing/invoices">
            <Button variant="outline" className="rounded-xl h-10 text-sm">
              <Receipt className="mr-2 h-4 w-4" /> {t('viewInvoices')}
            </Button>
          </Link>
          <NewInvoiceDialog />
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid gap-4 md:grid-cols-3 stagger-children">
        <Card className="card-hover border-0 shadow-sm bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -translate-y-14 translate-x-14" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-emerald-100">{t('kpis.totalRevenue')}</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 shadow-sm bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('kpis.pendingPayments')}</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">${stats.pendingAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 shadow-sm bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('kpis.paidInvoices')}</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-red-50/50 dark:bg-red-950/30 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">${stats.overdueAmount.toLocaleString()}</div>
            <p className="text-xs text-red-600 font-semibold mt-2 flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" /> Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="border-0 shadow-sm bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">{t('recentTransactions')}</CardTitle>
          <ExportCSVButton data={transactions} />
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('table.invoiceNum')}</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('table.patient')}</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('table.date')}</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('table.status')}</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">{t('table.amount')}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} className="table-row-hover group border-border">
                  <TableCell className="text-sm font-medium text-muted-foreground">
                    {tx.displayId}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-[10px]`}>
                        {tx.patientName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-foreground">{tx.patientName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tx.createdAt ? formatDate(tx.createdAt, locale) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[11px] font-semibold rounded-full px-2.5 border-none ${
                        tx.status === "PAID" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                        tx.status === "PENDING" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
                        "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                      }`}>
                      {t(`status.${tx.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm font-bold text-foreground">
                    <div className="flex flex-col items-end">
                      <span>${tx.totalAmount.toLocaleString()}</span>
                      {tx.paidAmount > 0 && tx.status !== 'PAID' && (
                        <span className="text-[10px] text-emerald-600 font-medium">Paid: ${tx.paidAmount.toLocaleString()}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <InvoiceRowActions invoice={tx} />
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="w-10 h-10 text-muted-foreground/30" />
                      <p>{t('noTransactions')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
