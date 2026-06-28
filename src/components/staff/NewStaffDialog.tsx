"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, UserPlus, Mail, Phone, Briefcase, Shield, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createStaff } from "@/app/actions/staff";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function NewStaffDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("staff");

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    title: "",
    email: "",
    phone: "",
    invite: true
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await createStaff(formData);
      toast.success("Staff invitation sent successfully");
      setOpen(false);
      
      // Reset form
      setFormData({
        name: "",
        role: "",
        title: "",
        email: "",
        phone: "",
        invite: true
      });
      
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create staff member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 rounded-xl h-10 px-5 font-medium border-0">
          <PlusCircle className="mr-2 h-4 w-4" /> {t('inviteStaff')}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md md:max-w-lg p-0 overflow-hidden bg-gray-50 dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
        <DialogHeader className="bg-white dark:bg-slate-900 dark:border-slate-800 px-6 py-4 flex flex-row items-center justify-between border-b shrink-0 m-0 space-y-0">
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <span className="bg-blue-100 dark:bg-blue-500/10 p-2 rounded-xl">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </span>
            {t('inviteStaff')}
          </DialogTitle>
        </DialogHeader>

        <form 
          onSubmit={handleSubmit} 
          className="flex-1 flex flex-col overflow-hidden max-h-[80vh]"
        >
          <div className="flex-1 overflow-y-auto w-full p-6 space-y-5">
            
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('form.name')}</Label>
              <Input 
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Dr. Sarah Smith" 
                className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus-visible:ring-blue-500 rounded-xl shadow-sm h-11" 
                required
                disabled={loading}
              />
            </div>

            {/* Role & Title */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('form.role')}</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <Select 
                    required 
                    value={formData.role} 
                    onValueChange={(val) => handleChange('role', val)}
                    disabled={loading}
                  >
                    <SelectTrigger className="pl-10 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus:ring-blue-500 rounded-xl shadow-sm h-11 w-full">
                      <SelectValue placeholder={t('form.selectRole')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t.has('roles.admin') ? t('roles.admin') : 'Admin'}</SelectItem>
                      <SelectItem value="doctor">{t.has('roles.doctor') ? t('roles.doctor') : 'Doctor'}</SelectItem>
                      <SelectItem value="assistant">{t.has('roles.assistant') ? t('roles.assistant') : 'Assistant'}</SelectItem>
                      <SelectItem value="receptionist">{t.has('roles.receptionist') ? t('roles.receptionist') : 'Receptionist'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Job Title</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <Input 
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="e.g. Lead Dentist" 
                    className="pl-10 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus-visible:ring-blue-500 rounded-xl shadow-sm h-11" 
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('form.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="sarah@smilecare.com" 
                    className="pl-10 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus-visible:ring-blue-500 rounded-xl shadow-sm h-11" 
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+1 234-567-8900" 
                    className="pl-10 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus-visible:ring-blue-500 rounded-xl shadow-sm h-11" 
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Send Invitation */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-sm mt-2">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-gray-900 dark:text-white">{t('form.sendInvitation')}</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Member will receive instructions to set up their account</p>
              </div>
              <Switch 
                id="invite" 
                checked={formData.invite}
                onCheckedChange={(val) => handleChange('invite', val)}
                disabled={loading}
                className="data-[state=checked]:bg-blue-600" 
              />
            </div>

          </div>
          
          <DialogFooter className="bg-white dark:bg-slate-900 dark:border-slate-800 px-6 py-4 border-t flex gap-3 shrink-0 w-full justify-end items-center">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
              className="px-6 rounded-xl border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 h-11 shadow-sm font-medium"
            >
              {t('form.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 h-11 font-semibold"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('form.sendInvitation')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
