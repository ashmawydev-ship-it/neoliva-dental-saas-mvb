import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getInvoice } from "@/app/actions/billing";
import { notFound } from "next/navigation";
import { PrintButton } from "./PrintButton";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;
  console.log(`[InvoiceDetailPage] Resolving ID:`, { id, allParams: resolvedParams });
  
  const invoice = await getInvoice(id);

  if (!invoice) {
    notFound();
  }

  const patient = invoice.patient || { name: "Unknown Patient", address: "N/A" };
  const items = invoice.items || [];
  const total = Number(invoice.totalAmount);
  const subtotal = items.reduce((sum: number, item: { price: string | number, quantity: number, description: string }) => sum + (Number(item.price) * item.quantity), 0);
  const tax = total - subtotal;
  const currency = invoice.settings?.currency || 'USD';
  const clinicName = invoice.settings?.clinicName || 'Neoliva Dental';
  const address = invoice.settings?.address || '123 Clinic Street';
  const email = invoice.settings?.email || 'contact@neoliva.com';
  const invoiceNote = invoice.settings?.invoiceNote || 'Thank you for choosing Neoliva Dental. Please keep this invoice for your records.';

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center gap-4 no-print">
        <Link href="/billing">
          <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Invoice #{invoice.displayId}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Issued: {new Date(invoice.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            <PrintButton />
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden bg-white dark:bg-slate-900 print:shadow-none">
        <CardContent className="p-8 md:p-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-gray-100 dark:border-slate-800 pb-8 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{clinicName}</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                {address}<br />{email}
              </p>
            </div>
            <div className="sm:text-right">
              <Badge className={`text-xs font-semibold rounded-full mb-3 px-3 py-1 border-none ${
                invoice.status === "PAID" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
                invoice.status === "PENDING" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" :
                "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
              }`}>
                {invoice.status}
              </Badge>
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Billed To</h3>
              <p className="text-sm text-gray-800 dark:text-white font-semibold">{patient.name}</p>
              {patient.address && <p className="text-sm text-gray-500 dark:text-gray-400">{patient.address}</p>}
            </div>
          </div>

          {/* Items */}
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent dark:border-slate-800 border-b">
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Qty</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Price</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: { description: string, quantity: number, price: string | number }, i: number) => (
                <TableRow key={i} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 border-b dark:border-slate-800">
                  <TableCell className="text-sm font-medium text-gray-900 dark:text-white">{item.description}</TableCell>
                  <TableCell className="text-sm text-gray-500 dark:text-gray-400 text-center">{item.quantity}</TableCell>
                  <TableCell className="text-sm text-gray-500 dark:text-gray-400 text-right">{currency} {Number(item.price).toFixed(2)}</TableCell>
                  <TableCell className="text-sm font-semibold text-gray-900 dark:text-white text-right">{currency} {(Number(item.price) * item.quantity).toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow className="border-b dark:border-slate-800">
                  <TableCell colSpan={4} className="text-center py-10 text-gray-400 dark:text-slate-500 italic">No items listed</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="mt-8 flex justify-end">
            <div className="w-72 space-y-3 text-sm">
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Subtotal</span><span className="text-gray-800 dark:text-white">{currency} {subtotal.toFixed(2)}</span></div>
              {tax > 0 && <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Tax</span><span className="text-gray-800 dark:text-white">{currency} {tax.toFixed(2)}</span></div>}
              <div className="flex justify-between border-t border-gray-200 dark:border-slate-800 pt-3 text-base">
                <span className="font-bold text-gray-900 dark:text-white">Total</span>
                <span className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-lg">{currency} {total.toFixed(2)}</span>
              </div>
              {invoice.paidAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Amount Paid</span>
                  <span>-{currency} {Number(invoice.paidAmount).toFixed(2)}</span>
                </div>
              )}
              {invoice.status !== 'PAID' && (
                <div className="flex justify-between border-t border-gray-100 dark:border-slate-800 pt-2 text-red-600 dark:text-red-400 font-bold">
                  <span>Balance Due</span>
                  <span>{currency} {(total - Number(invoice.paidAmount)).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
            <p className="text-xs text-gray-400 dark:text-slate-500 italic whitespace-pre-line">{invoiceNote}</p>
          </div>
        </CardContent>
      </Card>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .shadow-sm { box-shadow: none !important; }
          .animate-fade-in-up { animation: none !important; }
        }
      `}} />
    </div>
  );
}
