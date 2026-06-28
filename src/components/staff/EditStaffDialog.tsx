"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPen, Mail, Phone, Briefcase, Shield, Loader2, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateStaff, deleteStaff } from "@/app/actions/staff";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface EditStaffDialogProps {
  member: {
    id: string;
    name: string;
    role: string;
    title: string;
    email: string;
    phone: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditStaffDialog({ member, open, onOpenChange }: EditStaffDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: member.name,
    role: member.role.toLowerCase(),
    title: member.title,
    email: member.email,
    phone: member.phone === '—' ? '' : member.phone,
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await updateStaff(member.id, formData);
      toast.success("Staff member updated successfully");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update staff member");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this staff member? This action cannot be undone.")) return;
    
    setDeleting(true);
    try {
      await deleteStaff(member.id);
      toast.success("Staff member deleted successfully");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete staff member");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg p-0 overflow-hidden bg-gray-50 dark:bg-slate-900 border-0 shadow-2xl rounded-2xl dark:text-white">
        <DialogHeader className="bg-white dark:bg-slate-900 dark:border-slate-800 px-6 py-4 flex flex-row items-center justify-between border-b shrink-0 m-0 space-y-0">
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <span className="bg-blue-100 dark:bg-blue-500/10 p-2 rounded-xl">
              <UserPen className="h-5 w-5 text-blue-600" />
            </span>
            Edit Staff Member
          </DialogTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
            onClick={handleDelete}
            disabled={loading || deleting}
            title="Delete member"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </DialogHeader>

        <form 
          onSubmit={handleSubmit} 
          className="flex-1 flex flex-col overflow-hidden max-h-[85vh]"
        >
          <div className="flex-1 overflow-y-auto w-full p-8 space-y-8 custom-scrollbar">
            
            {/* Form Section: Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-8 bg-blue-500 rounded-full" />
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Personal Identity</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Full Name</Label>
                <div className="relative">
                  <Input 
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g. Dr. Sarah Smith" 
                    className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-2xl h-12 transition-all font-medium text-gray-900 dark:text-white" 
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Form Section: Role & Professional */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-8 bg-indigo-500 rounded-full" />
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Professional Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">System Role</Label>
                  <Select 
                    required 
                    value={formData.role} 
                    onValueChange={(val) => handleChange('role', val)}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 rounded-2xl h-12 w-full font-medium capitalize">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-500" />
                        <SelectValue placeholder="Select role" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-gray-100 dark:border-slate-800 shadow-2xl p-1">
                      <SelectItem value="admin" className="rounded-xl py-3 focus:bg-blue-50 dark:focus:bg-slate-800 focus:text-blue-600 dark:focus:text-blue-400">Admin</SelectItem>
                      <SelectItem value="doctor" className="rounded-xl py-3 focus:bg-blue-50 dark:focus:bg-slate-800 focus:text-blue-600 dark:focus:text-blue-400">Doctor</SelectItem>
                      <SelectItem value="assistant" className="rounded-xl py-3 focus:bg-blue-50 dark:focus:bg-slate-800 focus:text-blue-600 dark:focus:text-blue-400">Assistant</SelectItem>
                      <SelectItem value="receptionist" className="rounded-xl py-3 focus:bg-blue-50 dark:focus:bg-slate-800 focus:text-blue-600 dark:focus:text-blue-400">Receptionist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Job Title</Label>
                  <div className="relative group">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="e.g. Lead Dentist" 
                      className="pl-11 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-2xl h-12 transition-all font-medium text-gray-900 dark:text-white" 
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Section: Contact */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-8 bg-emerald-500 rounded-full" />
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Contact Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="sarah@smilecare.com" 
                      className="pl-11 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-2xl h-12 transition-all font-medium text-gray-900 dark:text-white" 
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Phone Number</Label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+1 234-567-8900" 
                      className="pl-11 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-2xl h-12 transition-all font-medium text-gray-900 dark:text-white" 
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
          
          <div className="bg-white dark:bg-slate-900 dark:border-slate-800 px-8 py-6 border-t flex flex-col sm:flex-row gap-3 shrink-0">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 sm:flex-none px-6 rounded-2xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 h-12 font-bold transition-all active:scale-95"
            >
              Discard Changes
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/20 h-12 font-bold transition-all active:scale-95"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Apply Updates'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
