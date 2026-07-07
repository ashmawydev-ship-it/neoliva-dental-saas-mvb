"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { PaymentModal } from "@/components/patients/billing/PaymentModal";
import { useRouter } from "next/navigation";

interface RecordPaymentButtonProps {
  invoice: any;
  patientId: string;
}

export function RecordPaymentButton({ invoice, patientId }: RecordPaymentButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  if (!invoice || invoice.status === "PAID") return null;

  return (
    <>
      <Button 
        onClick={() => setIsModalOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
      >
        <CreditCard className="w-4 h-4 mr-2" />
        Record Payment
      </Button>

      <PaymentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        invoice={invoice}
        patientId={patientId}
        onRefresh={() => router.refresh()}
      />
    </>
  );
}
