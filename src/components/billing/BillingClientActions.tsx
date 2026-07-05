"use client";

import { Button } from "@/components/ui/button";
import { Download, Printer, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface Transaction {
  id: string;
  displayId: string;
  patientName: string;
  createdAt: string | Date | null;
  status: string;
  totalAmount: number;
  paidAmount: number;
}

export function ExportCSVButton({ data }: { data: Transaction[] }) {
  const t = useTranslations("billing");
  const exportToCSV = () => {
    console.log(`[ExportCSVButton] Exporting ${data?.length || 0} transactions`);
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const headers = ["Invoice #", "Patient", "Date", "Status", "Total Amount", "Paid Amount"];
      const rows = data.map(tx => [
        tx.displayId,
        tx.patientName,
        tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'N/A',
        tx.status,
        tx.totalAmount.toString(),
        tx.paidAmount.toString()
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(e => e.join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("CSV export successful");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export CSV");
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="text-xs text-gray-500 rounded-lg"
      onClick={exportToCSV}
    >
      {t('exportCsv')} <Download className="ml-1.5 w-3 h-3" />
    </Button>
  );
}

export function InvoiceRowActions({ invoice }: { invoice: Transaction }) {
  const t = useTranslations("billing");
  const handlePrint = () => {
    console.log(`[InvoiceRowActions] Printing invoice:`, invoice.id);
    // Open the dynamic invoice page in a new tab for printing
    const win = window.open(`/billing/invoices/${invoice.id}?print=true`, '_blank');
    if (!win) {
      toast.error("Popup blocked! Please allow popups to print invoices.");
    } else {
      toast.info("Opening invoice in new tab for printing...");
    }
  };

  const handleDownload = () => {
    console.log(`[InvoiceRowActions] Downloading invoice:`, invoice.id);
    // Single row CSV download as a simple text file
    try {
      const content = `
Invoice: ${invoice.displayId}
Patient: ${invoice.patientName}
Date: ${invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : 'N/A'}
Status: ${invoice.status}
Total Amount: $${invoice.totalAmount}
Paid Amount: $${invoice.paidAmount}
      `.trim();

      const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${invoice.displayId}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started");
    } catch (error) {
      console.error("[InvoiceRowActions] Download failed:", error);
      toast.error("Failed to download invoice");
    }
  };

  return (
    <div className="flex gap-1 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
      {invoice.status !== 'PAID' && (
        <Link href={`/billing/invoices/${invoice.id}`}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-gray-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50"
            title="Record Payment"
            data-testid={`record-payment-${invoice.displayId}`}
          >
            <CreditCard className="h-3.5 w-3.5" />
          </Button>
        </Link>
      )}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50"
        onClick={handleDownload}
        title="Download TXT"
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
        onClick={handlePrint}
        title="Print"
      >
        <Printer className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
