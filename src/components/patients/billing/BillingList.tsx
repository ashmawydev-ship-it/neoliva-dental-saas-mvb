"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Receipt, 
  Plus, 
  CreditCard, 
  History, 
  Trash2, 
  Printer, 
  ChevronDown, 
  ChevronUp, 
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { deleteInvoice } from "@/app/actions/billing";
import { InvoiceForm } from "./InvoiceForm";
import { PaymentModal } from "./PaymentModal";
import { useTranslations } from "next-intl";

interface BillingListProps {
  patientId: string;
  patientName: string;
  invoiceHistory: any[];
  outstanding: number;
  clinicName?: string;
  onRefresh?: () => void;
}

export function BillingList({ 
  patientId, 
  patientName, 
  invoiceHistory = [], 
  outstanding,
  clinicName = "SmileCare",
  onRefresh 
}: BillingListProps) {
  const t = useTranslations('patientBilling');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  const handlePrint = (invoice: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>${t('print.invoice')} - ${invoice.displayId || invoice.id.substring(0, 8)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; margin: 0; padding: 40px; line-height: 1.5; }
            .invoice-card { max-width: 800px; margin: auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 30px; margin-bottom: 30px; }
            .logo { font-size: 32px; font-weight: 900; color: #4f46e5; letter-spacing: -1px; }
            .invoice-info { text-align: right; }
            .invoice-info h1 { margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
            .invoice-info p { margin: 4px 0; color: #64748b; font-size: 14px; font-weight: 600; }
            .details { display: grid; grid-cols: 2; gap: 40px; margin-bottom: 40px; }
            .details-section h3 { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 12px; }
            .details-section p { margin: 4px 0; font-size: 15px; font-weight: 500; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; background: #f8fafc; padding: 12px 15px; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
            td { padding: 15px; border-bottom: 1px solid #f1f5f9; font-size: 15px; font-weight: 500; }
            .amount-col { text-align: right; width: 120px; }
            .totals { margin-left: auto; width: 300px; }
            .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
            .total-row.grand-total { border-bottom: 0; padding-top: 20px; color: #4f46e5; }
            .total-row.grand-total span:last-child { font-size: 24px; font-weight: 900; }
            .status-badge { display: inline-block; padding: 6px 16px; border-radius: 100px; font-size: 12px; font-weight: 800; text-transform: uppercase; }
            .status-paid { background: #ecfdf5; color: #059669; }
            .status-partial { background: #fffbeb; color: #d97706; }
            .status-pending { background: #eff6ff; color: #2563eb; }
            .footer { margin-top: 60px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 30px; }
            @media print { body { padding: 0; } .invoice-card { border: 0; box-shadow: none; width: 100%; } }
          </style>
        </head>
        <body>
          <div class="invoice-card">
            <div class="header">
              <div class="logo">${clinicName}</div>
              <div class="invoice-info">
                <h1>${t('print.invoice')}</h1>
                <p>#${invoice.displayId || invoice.id.substring(0, 8).toUpperCase()}</p>
                <p>${new Date(invoice.createdAt).toLocaleDateString()}</p>
                <div class="status-badge status-${invoice.status.toLowerCase()}">${t('card.status.' + invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1).toLowerCase())}</div>
              </div>
            </div>

            <div style="display: flex; gap: 60px; margin-bottom: 50px;">
              <div class="details-section" style="flex: 1;">
                <h3>${t('print.from')}</h3>
                <p><strong>${clinicName}</strong></p>
              </div>
              <div class="details-section" style="flex: 1;">
                <h3>${t('print.billTo')}</h3>
                <p><strong>${patientName}</strong></p>
                <p>ID: ${patientId.substring(0, 8)}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>${t('print.description')}</th>
                  <th>${t('print.qty')}</th>
                  <th class="amount-col">${t('print.price')}</th>
                  <th class="amount-col">${t('print.total')}</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map((item: any) => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td class="amount-col">$${Number(item.price).toFixed(2)}</td>
                    <td class="amount-col">$${(Number(item.price) * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row">
                <span>${t('print.totalAmount')}</span>
                <span>$${Number(invoice.totalAmount).toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Total Paid</span>
                <span>$${Number(invoice.paidAmount).toFixed(2)}</span>
              </div>
              <div class="total-row grand-total">
                <span>${t('print.balanceDue')}</span>
                <span>$${(Number(invoice.totalAmount) - Number(invoice.paidAmount)).toFixed(2)}</span>
              </div>
            </div>

            <div class="footer">
              <p>${t('print.thankYou', { clinicName })}</p>
              <p>${t('print.checksPayable', { clinicName })}</p>
            </div>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDelete = async (invoiceId: string) => {
    if (!confirm(t('toast.deleteConfirm', { defaultValue: "Are you sure you want to delete this invoice? This action cannot be undone." }))) return;
    
    const toastId = toast.loading(t('toast.deleting'));
    try {
      const result = await deleteInvoice(patientId, invoiceId);
      if (result.success) {
        toast.success(t('toast.deleted'), { id: toastId });
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || t('toast.deleteFailed'), { id: toastId });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100">{t('card.status.Paid')}</Badge>;
      case 'OVERDUE':
        return <Badge className="bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100">{t('card.status.Overdue')}</Badge>;
      default:
        return <Badge className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100">{t('card.status.Pending')}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Financial Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-600 to-blue-700 text-white overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-100 text-sm font-medium">{t('kpis.outstandingBalance')}</p>
                <h3 className="text-3xl font-black mt-1">${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-indigo-100/80 text-xs font-bold uppercase tracking-wider">
              <AlertCircle className="w-3.5 h-3.5" />
              {t('kpis.unpaidInvoices', { n: invoiceHistory.filter(i => i.status !== 'PAID').length })}
            </div>
          </CardContent>
          <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden dark:border dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm font-medium">{t('kpis.totalBilled')}</p>
                <h3 className="text-3xl font-black mt-1 text-gray-900 dark:text-white">
                  ${invoiceHistory.reduce((sum, inv) => sum + Number(inv.totalAmount), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
              <History className="w-3.5 h-3.5" />
              {t('kpis.lifetimeValue')}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden dark:border dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm font-medium">{t('kpis.totalPaid')}</p>
                <h3 className="text-3xl font-black mt-1 text-emerald-600">
                  ${invoiceHistory.reduce((sum, inv) => sum + Number(inv.paidAmount), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-emerald-500/70 text-xs font-bold uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5" />
              {t('kpis.successfulTransactions')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white ml-2">{t('invoiceHistory')}</h4>
        <Button 
          onClick={() => setIsInvoiceModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2" /> {t('createInvoice')}
        </Button>
      </div>

      {/* Invoice List */}
      <div className="space-y-4">
        {invoiceHistory.length === 0 ? (
          <div className="py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-200 dark:text-gray-600 mb-4">
              <Receipt className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{t('empty')}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
              Start by creating an invoice for treatments provided.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setIsInvoiceModalOpen(true)}
              className="mt-6 rounded-xl border-gray-200"
            >
              <Plus className="w-4 h-4 mr-2" /> {t('createInvoice')}
            </Button>
          </div>
        ) : (
          invoiceHistory.map((invoice) => (
            <Card key={invoice.id} className={cn(
              "border border-transparent dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300 bg-white dark:bg-slate-900",
              expandedInvoice === invoice.id ? "ring-2 ring-indigo-500/10 shadow-xl" : "hover:shadow-md hover:border-gray-200 dark:hover:border-slate-700"
            )}>
              <CardContent className="p-0">
                <div 
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                      invoice.status === 'PAID' ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    )}>
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-black text-gray-900 dark:text-white truncate">{invoice.displayId || `INV-${invoice.id.substring(0, 8).toUpperCase()}`}</span>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(invoice.createdAt).toLocaleDateString()}</span>
                        {invoice.items?.[0] && (
                          <span className="flex items-center gap-1 truncate"><History className="w-3 h-3" /> {invoice.items[0].description}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">{t('card.amount')}</p>
                      <p className="text-lg font-black text-gray-900 dark:text-white">${Number(invoice.totalAmount).toLocaleString()}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">{t('card.balance')}</p>
                      <p className={cn(
                        "text-lg font-black",
                        (Number(invoice.totalAmount) - Number(invoice.paidAmount)) > 0 ? "text-rose-500" : "text-emerald-500"
                      )}>${(Number(invoice.totalAmount) - Number(invoice.paidAmount)).toLocaleString()}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {invoice.status !== 'PAID' && (
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(invoice);
                            setIsPaymentModalOpen(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold h-9 shadow-lg shadow-emerald-50 transition-all active:scale-95"
                        >
                          <CreditCard className="w-4 h-4 mr-2" /> Pay
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-gray-400 dark:hover:bg-slate-800">
                        {expandedInvoice === invoice.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedInvoice === invoice.id && (
                  <div className="px-5 pb-5 pt-2 border-t border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/50 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                      {/* Items */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('print.invoiceItems')}</h5>
                          <Badge variant="outline" className="bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-slate-700">{invoice.items?.length || 0} Items</Badge>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                          {invoice.items?.map((item: any, idx: number) => (
                            <div key={item.id} className={cn(
                              "flex justify-between items-center p-3 text-sm font-medium",
                              idx !== invoice.items.length - 1 && "border-b border-gray-50 dark:border-slate-700"
                            )}>
                              <div className="flex flex-col">
                                <span className="text-gray-700 dark:text-gray-300">{item.description}</span>
                                <span className="text-[10px] text-gray-400">Qty: {item.quantity} × ${Number(item.price).toFixed(2)}</span>
                              </div>
                              <span className="font-bold text-gray-900 dark:text-white">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="bg-gray-50/50 dark:bg-slate-900/50 p-3 flex justify-between items-center text-sm font-black border-t border-gray-100 dark:border-slate-700">
                            <span className="text-gray-500">{t('print.totalAmount')}</span>
                            <span className="text-indigo-600 dark:text-indigo-400">${Number(invoice.totalAmount).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Payments */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('paymentHistory.title')}</h5>
                          <Badge variant="outline" className="bg-white dark:bg-slate-800 text-emerald-500 border-emerald-50 dark:border-emerald-900/30">{invoice.payments?.length || 0} Payments</Badge>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                          {(!invoice.payments || invoice.payments.length === 0) ? (
                            <div className="p-8 text-center text-gray-400">
                              <p className="text-xs font-medium italic">{t('paymentHistory.empty')}</p>
                            </div>
                          ) : (
                            invoice.payments.map((payment: any, idx: number) => (
                              <div key={payment.id} className={cn(
                                "flex justify-between items-center p-3 text-sm",
                                idx !== invoice.payments.length - 1 && "border-b border-gray-50 dark:border-slate-700"
                              )}>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900 dark:text-white">${Number(payment.amount).toFixed(2)}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{payment.method} · {new Date(payment.paidAt).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 border-0 h-5 text-[9px] font-bold uppercase">Success</Badge>
                                </div>
                              </div>
                            ))
                          )}
                          <div className="bg-gray-50/50 dark:bg-slate-900/50 p-3 flex justify-between items-center text-sm font-black border-t border-gray-100 dark:border-slate-700">
                            <span className="text-gray-500">Total Paid</span>
                            <span className="text-emerald-600 dark:text-emerald-400">${Number(invoice.paidAmount).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(invoice.id)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl h-10 font-bold">
                        <Trash2 className="w-4 h-4 mr-2" /> {t('toast.deleting', { defaultValue: "Delete Invoice" })}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl h-10 border-gray-200 dark:border-slate-700 font-bold text-gray-700 dark:text-gray-300 dark:hover:bg-slate-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrint(invoice);
                        }}
                      >
                        <Printer className="w-4 h-4 mr-2" /> Print Invoice
                      </Button>
                      {invoice.status !== 'PAID' && (
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setIsPaymentModalOpen(true);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-6 font-bold shadow-lg shadow-indigo-50"
                        >
                          Record Payment <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <InvoiceForm 
        isOpen={isInvoiceModalOpen} 
        onClose={() => setIsInvoiceModalOpen(false)} 
        patientId={patientId}
        onRefresh={onRefresh}
      />

      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedInvoice(null);
        }} 
        invoice={selectedInvoice}
        patientId={patientId}
        onRefresh={onRefresh}
      />
    </div>
  );
}
