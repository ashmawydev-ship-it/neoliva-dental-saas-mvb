'use client'

import { useState, useEffect } from 'react'
import { Pill, Calendar, User, Printer, Trash2, Copy, MoreVertical, ChevronRight, FileText, Download, Loader2, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { deletePrescription, duplicatePrescription } from '@/app/actions/prescriptions'
import { toast } from 'sonner'
import { PrescriptionForm } from './PrescriptionForm'
import { PrescriptionPrint } from '@/components/patients/prescriptions/PrescriptionPrint'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useTranslations } from 'next-intl'

interface Prescription {
  id: string
  date: Date | null
  notes: string | null
  doctorName: string | null
  items: {
    id: string
    medicationName: string
    dosage: string | null
    frequency: string | null
    duration: string | null
  }[]
  doctor?: any
}

export function PrescriptionList({ 
  patientId, 
  prescriptions: initialPrescriptions,
  patientName,
  onRefresh
}: { 
  patientId: string
  prescriptions: any[]
  patientName: string
  onRefresh?: () => void
}) {
  const t = useTranslations('prescriptions')
  const [prescriptions, setPrescriptions] = useState(initialPrescriptions)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  // Sync state with props when initialPrescriptions changes
  useEffect(() => {
    setPrescriptions(initialPrescriptions)
  }, [initialPrescriptions])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prescription?')) return
    
    setLoading(id)
    try {
      const res = await deletePrescription(id, patientId)
      if (res.success) {
        setPrescriptions(prescriptions.filter(p => p.id !== id))
        toast.success(t('toast.deleted'))
      }
    } catch (error) {
      toast.error(t('toast.deleteFailed'))
    } finally {
      setLoading(null)
    }
  }

  const handleDuplicate = async (id: string) => {
    setLoading(id)
    try {
      const res = await duplicatePrescription(id, patientId)
      if (res.success) {
        setPrescriptions([res.data, ...prescriptions])
        toast.success(t('toast.duplicated'))
      }
    } catch (error) {
      toast.error(t('toast.duplicateFailed'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('title')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md text-white font-medium">
          <Pill className="w-4 h-4 mr-2" /> {t('newPrescription')}
        </Button>
      </div>

      <div className="grid gap-4">
        {prescriptions.length > 0 ? prescriptions.map((rx) => (
          <Card key={rx.id} className="border border-transparent dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden group bg-transparent">
            <CardContent className="p-0">
              <div className="p-5 flex items-center justify-between bg-white dark:bg-slate-900">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white">{t('card.prescriptionNum', { id: rx.id.slice(-4).toUpperCase() })}</span>
                      <Badge variant="outline" className="text-[10px] font-medium border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                        {t('card.medicationsCount', { n: rx.items.length })}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(rx.date || rx.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Dr. {rx.doctorName || rx.doctor?.name || 'Clinic Doctor'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPrintingId(rx.id)}
                    className="h-9 px-4 rounded-lg border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 dark:text-slate-300 dark:bg-slate-800 transition-all text-xs font-semibold"
                  >
                    <Printer className="w-3.5 h-3.5 mr-2" /> {t('card.print')}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-gray-400 dark:text-gray-500 dark:hover:bg-slate-800">
                        {loading === rx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-xl dark:bg-slate-900 dark:border-slate-800">
                      <DropdownMenuItem onClick={() => handleDuplicate(rx.id)} className="rounded-lg gap-2 cursor-pointer py-2 dark:hover:bg-slate-800">
                        <Copy className="w-4 h-4 text-blue-500" />
                        <span className="dark:text-slate-300">Duplicate (كرر)</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer py-2 text-gray-500 dark:text-gray-400 dark:hover:bg-slate-800">
                        <Download className="w-4 h-4" />
                        <span>{t('actions.downloadPdf')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(rx.id)} className="rounded-lg gap-2 cursor-pointer py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="w-4 h-4" />
                        <span>{t('actions.delete')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Collapsible/Preview Items */}
              <div className="px-5 pb-5 border-t border-gray-50 dark:border-slate-800 pt-4 bg-gray-50/30 dark:bg-slate-900/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rx.items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0">
                        <Pill className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.medicationName}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{item.dosage} · {item.frequency} · {item.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {rx.notes && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/30 text-[11px] text-amber-800 dark:text-amber-400 italic">
                    <span className="font-bold not-italic">{t('card.notes')}</span> {rx.notes}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="text-center py-12 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-3xl bg-gray-50/50 dark:bg-slate-900/50">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-200 dark:text-blue-500 mx-auto mb-4">
              <Pill className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t('empty.title')}</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-6">{t('empty.subtitle')}</p>
            <Button onClick={() => setIsFormOpen(true)} variant="outline" className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50">
              <Plus className="w-4 h-4 mr-2" /> {t('newPrescription')}
            </Button>
          </div>
        )}
      </div>

      <PrescriptionForm 
        patientId={patientId} 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen}
        onSuccess={() => {
          if (onRefresh) {
            onRefresh()
          } else {
            window.location.reload()
          }
          setIsFormOpen(false)
        }}
      />

      {/* Print Modal */}
      <Dialog open={printingId !== null} onOpenChange={(open) => !open && setPrintingId(null)}>
        <DialogContent className="max-w-4xl p-0 h-[90vh] overflow-hidden bg-gray-100 flex flex-col">
          <div className="p-4 bg-white border-b flex items-center justify-between shrink-0">
            <h3 className="font-bold">{t('printDialog.title')}</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPrintingId(null)}>{t('printDialog.close')}</Button>
              <Button size="sm" onClick={() => window.print()} className="bg-blue-600">{t('printDialog.printNow')}</Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 bg-gray-50 flex justify-center">
            {printingId && (
              <PrescriptionPrint 
                prescription={prescriptions.find(p => p.id === printingId)}
                patientName={patientName}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
