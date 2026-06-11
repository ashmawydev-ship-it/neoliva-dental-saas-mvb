

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Printer, FileDown, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function InvoicePage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Link href="/billing">
          <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Invoice #INV-2024-001</h1>
            <p className="text-sm text-gray-500">Issued: March 28, 2024</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl h-9 text-sm"><Printer className="w-4 h-4 mr-2" /> Print</Button>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl h-9 text-sm shadow-lg shadow-blue-500/20"><FileDown className="w-4 h-4 mr-2" /> Export PDF</Button>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-8 md:p-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-gray-100 pb-8 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-gray-900">SmileCare</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                123 Dental Street, Suite 400<br />New York, NY 10001<br />contact@smilecare.com
              </p>
            </div>
            <div className="sm:text-right">
              <Badge className="bg-amber-50 text-amber-700 border-amber-100 text-xs font-semibold rounded-full mb-3">Pending Payment</Badge>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Billed To</h3>
              <p className="text-sm text-gray-800 font-semibold">Emily Johnson</p>
              <p className="text-sm text-gray-500">456 Patient Ave.<br />New York, NY 10002</p>
            </div>
          </div>

          {/* Items */}
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Qty</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Price</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { service: "General Consultation", qty: 1, price: 150 },
                { service: "Panoramic X-Ray", qty: 1, price: 85 },
                { service: "Teeth Cleaning & Polishing", qty: 1, price: 120 },
              ].map((item, i) => (
                <TableRow key={i} className="hover:bg-gray-50/50">
                  <TableCell className="text-sm font-medium text-gray-900">{item.service}</TableCell>
                  <TableCell className="text-sm text-gray-500 text-center">{item.qty}</TableCell>
                  <TableCell className="text-sm text-gray-500 text-right">${item.price.toFixed(2)}</TableCell>
                  <TableCell className="text-sm font-semibold text-gray-900 text-right">${(item.price * item.qty).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="mt-8 flex justify-end">
            <div className="w-72 space-y-3 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="text-gray-800">$355.00</span></div>
              <div className="flex justify-between text-gray-500"><span>Tax (8.875%)</span><span className="text-gray-800">$31.51</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-3 text-base">
                <span className="font-bold text-gray-900">Total Due</span>
                <span className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-lg">$386.51</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">Thank you for choosing SmileCare. Payment is due within 30 days of the invoice date.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
