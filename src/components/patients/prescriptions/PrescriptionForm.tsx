'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, X, Pill, Clock, Activity, Hash, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createPrescription } from '@/app/actions/prescriptions'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

interface PrescriptionItem {
  medicationName: string
  dosage: string
  frequency: string
  duration: string
}

export function PrescriptionForm({ 
  patientId, 
  open, 
  onOpenChange,
  onSuccess 
}: { 
  patientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (newPrescription?: any) => void
}) {
  const t = useTranslations('prescriptions')
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<PrescriptionItem[]>([
    { medicationName: '', dosage: '', frequency: '', duration: '' }
  ])

  const addItem = () => {
    setItems([...items, { medicationName: '', dosage: '', frequency: '', duration: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof PrescriptionItem, value: string) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  const handleSubmit = async () => {
    const validItems = items.filter(i => i.medicationName.trim())
    if (validItems.length === 0) {
      toast.error('Please add at least one medication')
      return
    }

    setLoading(true)
    try {
      const res = await createPrescription(patientId, {
        notes,
        items: validItems
      })

      if (res.success) {
        toast.success('Prescription created')
        onOpenChange(false)
        setItems([{ medicationName: '', dosage: '', frequency: '', duration: '' }])
        setNotes('')
        onSuccess?.(res.data)
      } else {
        toast.error(res.error)
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-white dark:bg-slate-900 dark:text-white rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-600" />
            {t('newPrescription')}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Items List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                Medications
                <Badge variant="secondary" className="h-5 px-1.5 bg-blue-100 text-blue-700 border-0">
                  {items.length}
                </Badge>
              </label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addItem}
                className="h-8 rounded-lg border-blue-200 bg-white text-blue-600 hover:bg-blue-50 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Med
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50 group animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="col-span-4 space-y-1.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Hash className="w-3 h-3 text-blue-500" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{t('form.medication')}</span>
                    </div>
                    <Input
                      name="medication"
                      placeholder={t('form.phMedication')}
                      value={item.medicationName}
                      onChange={(e) => updateItem(index, 'medicationName', e.target.value)}
                      className="h-9 bg-white border-gray-200 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Activity className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{t('form.dosage')}</span>
                    </div>
                    <Input
                      name="dosage"
                      placeholder={t('form.phDosage')}
                      value={item.dosage}
                      onChange={(e) => updateItem(index, 'dosage', e.target.value)}
                      className="h-9 bg-white border-gray-200"
                    />
                  </div>
                  <div className="col-span-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{t('form.frequency')}</span>
                    </div>
                    <Input
                      name="frequency"
                      placeholder={t('form.phFrequency')}
                      value={item.frequency}
                      onChange={(e) => updateItem(index, 'frequency', e.target.value)}
                      className="h-9 bg-white border-gray-200"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Hash className="w-3 h-3 text-purple-500" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{t('form.duration')}</span>
                    </div>
                    <Input
                      name="duration"
                      placeholder={t('form.phDuration')}
                      value={item.duration}
                      onChange={(e) => updateItem(index, 'duration', e.target.value)}
                      className="h-9 bg-white border-gray-200"
                    />
                  </div>
                  <div className="col-span-1 flex items-end justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="h-9 w-9 text-gray-300 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('form.instructions')}</label>
            <Textarea
              placeholder={t('form.phInstructions')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] rounded-xl border-gray-200 bg-gray-50/50 resize-none focus:ring-blue-500/20"
            />
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 flex gap-3 border-t border-gray-50 bg-gray-50/30">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="flex-1 rounded-xl h-11 text-gray-500 font-semibold"
          >
            {t('form.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {t('form.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
