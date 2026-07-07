"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Search, CalendarDays, Clock, 
  CheckCircle2, XCircle, AlertCircle, MoreHorizontal, LayoutList, Calendar as CalendarIcon,
  Receipt, DollarSign, MapPin
} from "lucide-react";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { generateInvoiceFromAppointment } from "@/app/actions/billing";
import { updateAppointmentStatus, assignRoomToAppointment } from "@/app/actions/appointments";
import { toast } from "sonner";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

const statusConfig: Record<string, { icon: any; className: string }> = {
  COMPLETED: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" },
  IN_PROGRESS: { icon: AlertCircle, className: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  SCHEDULED: { icon: Clock, className: "bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  CANCELLED: { icon: XCircle, className: "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
  WAITING: { icon: Clock, className: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
};

export function AppointmentsView({ initialAppointments, rooms = [] }: { initialAppointments: any[], rooms?: any[] }) {
  const [appointmentsList, setAppointmentsList] = useState<any[]>(initialAppointments);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [editingApt, setEditingApt] = useState<any>(null);
  const [assigningRoomApt, setAssigningRoomApt] = useState<any | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedChairId, setSelectedChairId] = useState<string>("");
  const [generatingInvoiceApt, setGeneratingInvoiceApt] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    setAppointmentsList(initialAppointments);
  }, [initialAppointments]);

  const handleStatusUpdate = async (id: string, status: string) => {
    setIsUpdating(id);
    try {
      const res = await updateAppointmentStatus(id, status);
      if (res.success) {
        toast.success(`Appointment status updated to ${status}`);
        setEditingApt(null);
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleAssignRoom = async () => {
    if (!assigningRoomApt || !selectedRoomId) return;
    setIsUpdating(assigningRoomApt.id);
    try {
      const res = await assignRoomToAppointment(assigningRoomApt.id, selectedRoomId, selectedChairId || undefined);
      if (res) {
        toast.success(`Room assigned successfully`);
        setAssigningRoomApt(null);
        setSelectedRoomId("");
        setSelectedChairId("");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to assign room");
    } finally {
      setIsUpdating(null);
    }
  };

  const filtered = appointmentsList.filter((a) => {
    const matchesSearch =
      a.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.treatment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "All" || a.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by patient or treatment..."
            className="pl-10 h-10 rounded-xl bg-white border-gray-200 focus-visible:ring-blue-500/20 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 p-1 bg-gray-100/80 rounded-xl overflow-x-auto dark:bg-slate-800">
          {["All", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${filterStatus === status
                  ? "bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
            >
              {status === "All" ? "All" : status.replace('_', ' ').toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-gray-100/80 p-1 rounded-xl dark:bg-slate-800">
          <button onClick={() => setView("list")} className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${view === "list" ? "bg-white shadow-sm text-blue-600 dark:bg-slate-700 dark:text-blue-400" : "text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"}`}>
            <LayoutList className="w-4 h-4" />
          </button>
          <button onClick={() => setView("calendar")} className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${view === "calendar" ? "bg-white shadow-sm text-blue-600 dark:bg-slate-700 dark:text-blue-400" : "text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"}`}>
            <CalendarIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {view === "list" ? (
        <Card className="border-0 shadow-sm overflow-hidden animate-fade-in-up dark:bg-slate-900">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 dark:bg-slate-800 dark:hover:bg-slate-800 border-b-slate-800">
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Treatment</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((apt) => {
                const config = statusConfig[apt.status] || statusConfig.SCHEDULED;
                const StatusIcon = config.icon;
                return (
                  <TableRow key={apt.id} className="table-row-hover group dark:border-b-slate-800 dark:hover:bg-slate-800/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${apt.color} flex items-center justify-center text-white font-bold text-[10px]`}>
                          {apt.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{apt.patient}</p>
                          <p className="text-[10px] text-gray-400 font-mono uppercase dark:text-slate-500">{apt.id.split('-')[0]}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-300">{apt.doctor}</TableCell>
                    <TableCell className="text-sm text-gray-700 font-medium dark:text-slate-200">{apt.treatment}</TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-700 dark:text-slate-200">{apt.date}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1 dark:text-slate-500">
                        <Clock className="w-3 h-3" /> {apt.time}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${config.className} border text-[11px] font-semibold rounded-full px-2.5 hover:${config.className.split(' ')[0]}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {apt.status.replace('_', ' ').toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 rounded-lg hover:bg-gray-100 flex items-center justify-center cursor-pointer border-0 bg-transparent">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-lg border-gray-100 border p-1">
                          <DropdownMenuItem onClick={() => router.push(`/appointments/${apt.id}`)} className="text-sm rounded-lg font-medium text-blue-700 focus:bg-blue-50 focus:text-blue-800 cursor-pointer">
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingApt(apt)} className="text-sm rounded-lg font-medium text-gray-700 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">
                            Edit Status
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              setAssigningRoomApt(apt);
                              setSelectedRoomId(apt.roomId || "");
                              setSelectedChairId(apt.chairId || "");
                            }} 
                            className="text-sm rounded-lg font-semibold text-purple-600 focus:bg-purple-50 focus:text-purple-700 cursor-pointer"
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            Assign Room
                          </DropdownMenuItem>
                          
                          {!apt.hasInvoice && apt.status === "COMPLETED" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setGeneratingInvoiceApt(apt);
                                }} 
                                className="text-sm rounded-lg font-semibold text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer"
                              >
                                <Receipt className="w-4 h-4 mr-2" />
                                Generate Invoice
                              </DropdownMenuItem>
                            </>
                          )}

                          <DropdownMenuItem 
                            disabled={isUpdating === apt.id}
                            onClick={() => handleStatusUpdate(apt.id, "CANCELLED")} 
                            className="text-sm text-red-600 rounded-lg font-medium focus:bg-red-50 focus:text-red-700 cursor-pointer"
                          >
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-slate-400">
                    No appointments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <CalendarView items={filtered} />
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingApt} onOpenChange={(open) => !open && setEditingApt(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl dark:bg-slate-900">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-row items-center justify-between m-0 dark:bg-slate-800 dark:border-slate-700">
            <DialogTitle className="text-lg font-bold text-gray-800 dark:text-white">Edit Appointment Status</DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-4 dark:bg-blue-900/20 dark:border-blue-800">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold bg-gradient-to-br ${editingApt?.color || 'from-gray-400 to-gray-500'} shadow-md`}>
                {editingApt?.avatar}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{editingApt?.patient}</h3>
                <p className="text-xs font-semibold text-gray-500 tracking-wider uppercase mt-1 dark:text-slate-400">{editingApt?.treatment}</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider dark:text-slate-300">Update Status</label>
              <div className="grid grid-cols-2 gap-3">
                {["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map(s => {
                  const Icon = statusConfig[s] ? statusConfig[s].icon : Clock;
                  const label = s.replace('_', ' ');
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={isUpdating === editingApt?.id}
                      onClick={() => handleStatusUpdate(editingApt.id, s)}
                      data-testid={`status-update-${s}`}
                      className={`p-3 border rounded-xl flex items-center gap-2 font-semibold text-xs capitalize transition-all shadow-sm ${editingApt?.status === s
                          ? 'ring-2 ring-blue-500 border-transparent bg-blue-50 shadow-blue-500/20 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:border-slate-600'
                        } ${isUpdating === editingApt?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Icon className={`w-4 h-4 ${editingApt?.status === s ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'}`} />
                      {label.toLowerCase()}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Invoice Dialog */}
      <Dialog open={!!generatingInvoiceApt} onOpenChange={(open) => !open && setGeneratingInvoiceApt(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl dark:bg-slate-900 dark:text-white">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-row items-center justify-between m-0">
            <DialogTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              Generate Patient Invoice
            </DialogTitle>
          </DialogHeader>

          <div className="p-6">
            <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mb-6">
              <div className="bg-emerald-100 p-3 rounded-xl">
                <Receipt className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Generate Invoice</h4>
                <p className="text-sm text-gray-600">The amount is automatically synced with the clinic pricing.</p>
              </div>
            </div>
            
            <div className="space-y-4 px-1">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Patient</span>
                <span className="text-sm font-bold text-gray-900">{generatingInvoiceApt?.patient}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Treatment</span>
                <span className="text-sm font-bold text-gray-900">{generatingInvoiceApt?.treatment}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Date</span>
                <span className="text-sm font-bold text-gray-900">{generatingInvoiceApt?.date}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 sm:justify-end shrink-0">
            <Button 
              variant="ghost" 
              onClick={() => setGeneratingInvoiceApt(null)} 
              className="rounded-2xl font-bold text-gray-500 hover:bg-gray-100 h-12 px-6" 
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button 
              disabled={isGenerating}
              onClick={async () => {
                setIsGenerating(true);
                const res = await generateInvoiceFromAppointment(generatingInvoiceApt.id);
                setIsGenerating(false);
                
                if (res.success) {
                  toast.success("Invoice generated successfully!");
                  setGeneratingInvoiceApt(null);
                } else {
                  toast.error(res.error || "Failed to generate invoice");
                }
              }} 
              className="rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200 h-12 px-8 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
            >
              {isGenerating ? "Generating..." : "Confirm & Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Room Dialog */}
      <Dialog 
        open={!!assigningRoomApt} 
        onOpenChange={(open) => {
          if (!open) {
            setAssigningRoomApt(null);
            setSelectedRoomId("");
            setSelectedChairId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl dark:bg-slate-900">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-row items-center justify-between m-0 dark:bg-slate-800 dark:border-slate-700">
            <DialogTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              Assign Room & Chair
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl flex items-center gap-4 dark:bg-purple-900/20 dark:border-purple-800">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold bg-gradient-to-br ${assigningRoomApt?.color || 'from-gray-400 to-gray-500'} shadow-md`}>
                {assigningRoomApt?.avatar}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{assigningRoomApt?.patient}</h3>
                <p className="text-xs font-semibold text-gray-500 tracking-wider uppercase mt-1 dark:text-slate-400">{assigningRoomApt?.treatment}</p>
                <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
                  {assigningRoomApt?.date && format(new Date(assigningRoomApt.date), "MMM d, yyyy")} • {assigningRoomApt?.time} ({assigningRoomApt?.duration || 30} min)
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 dark:text-slate-300">Select Room</label>
                <select
                  className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all dark:bg-slate-900 dark:border-slate-800 dark:text-white outline-none"
                  value={selectedRoomId}
                  onChange={(e) => {
                    setSelectedRoomId(e.target.value);
                    setSelectedChairId(""); // Reset chair when room changes
                  }}
                  disabled={isUpdating === assigningRoomApt?.id}
                >
                  <option value="">-- Choose a Room --</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRoomId && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 opacity-100 duration-300">
                  <label className="text-sm font-bold text-gray-700 dark:text-slate-300">Select Chair</label>
                  <select
                    className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all dark:bg-slate-900 dark:border-slate-800 dark:text-white outline-none"
                    value={selectedChairId}
                    onChange={(e) => setSelectedChairId(e.target.value)}
                    disabled={isUpdating === assigningRoomApt?.id}
                  >
                    <option value="">-- Any Chair / No Specific Chair --</option>
                    {rooms
                      .find((r) => r.id === selectedRoomId)
                      ?.roomChairs?.map((chair: any) => (
                        <option key={chair.id} value={chair.id}>
                          {chair.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
            
            <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-11 rounded-xl font-bold dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 dark:border-slate-700"
                onClick={() => setAssigningRoomApt(null)}
                disabled={!!isUpdating}
              >
                Cancel
              </Button>
              <Button
                className="w-full sm:w-auto h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-500/20"
                onClick={handleAssignRoom}
                disabled={!selectedRoomId || isUpdating === assigningRoomApt?.id}
              >
                {isUpdating === assigningRoomApt?.id ? "Saving..." : "Save Assignment"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CalendarView({ items }: { items: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthItems = items.filter((a: any) => isSameMonth(new Date(a.startTime), currentDate))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <Card className="border-0 shadow-sm overflow-hidden py-0 px-0 animate-fade-in-up bg-white dark:bg-slate-900">
      <div className="flex bg-white dark:bg-slate-900 justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-600" /> {format(currentDate, "MMMM yyyy")}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 w-8 p-0 rounded-lg text-gray-500 cursor-pointer dark:text-slate-400 dark:border-slate-700">&lt;</Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="h-8 rounded-lg font-semibold text-gray-700 cursor-pointer dark:text-slate-300 dark:border-slate-700">Today</Button>
          <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0 rounded-lg text-gray-500 cursor-pointer dark:text-slate-400 dark:border-slate-700">&gt;</Button>
        </div>
      </div>

      {/* Desktop Calendar Grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/80 dark:border-slate-800 dark:bg-slate-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-r last:border-r-0 border-gray-100 dark:text-slate-400 dark:border-slate-800">
              {d}
            </div>
          ))}
        </div>
        <div className="flex flex-col bg-gray-200/50 gap-[1px] dark:bg-slate-800">
          <div className="grid grid-cols-7 gap-[1px]">
            {days.map((day, i) => {
              const dayApps = items.filter((a: any) => isSameDay(new Date(a.startTime), day));
              const isCurrentMonth = isSameMonth(day, monthStart);

              return (
                <div key={i} className={`min-h-[140px] bg-white dark:bg-slate-900 p-2 flex flex-col ${!isCurrentMonth ? 'bg-gray-50/50 opacity-50 dark:bg-slate-800' : 'hover:bg-blue-50/10 dark:hover:bg-blue-900/10'}`}>
                  <span className={`text-sm font-semibold mb-2 w-8 h-8 flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 dark:text-slate-300'}`}>
                    {format(day, "d")}
                  </span>
                  <div className="flex flex-col gap-1.5 overflow-y-auto mt-1 scrollbar-hide max-h-[100px] pb-2">
                    {dayApps.map((app: any) => (
                      <div key={app.id} className="text-[10px] p-2 rounded-lg border border-gray-100 flex items-start gap-1.5 cursor-pointer hover:shadow-md transition-all bg-white relative overflow-hidden group dark:bg-slate-800 dark:border-slate-700">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${app.color} opacity-80`} />
                        <div className="pl-2 leading-tight flex-1">
                          <p className="font-bold text-gray-800 truncate mb-0.5 dark:text-white">{app.time}</p>
                          <p className="text-gray-600 font-medium truncate group-hover:text-blue-600 transition-colors dark:text-slate-300 dark:group-hover:text-blue-400">{app.patient}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Calendar List View */}
      <div className="block md:hidden">
        {monthItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm dark:text-slate-400">
            No appointments scheduled for this month.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {monthItems.map((app: any) => {
              const appDate = new Date(app.startTime);
              return (
                <div key={app.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors dark:hover:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.color} flex flex-col items-center justify-center text-white flex-shrink-0`}>
                      <span className="text-[9px] font-bold uppercase">{format(appDate, "MMM")}</span>
                      <span className="text-sm font-extrabold -mt-1">{format(appDate, "d")}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{app.patient}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 dark:text-slate-400">
                        <Clock className="w-3 h-3 text-gray-400" /> {app.time} · {app.doctor}
                      </p>
                    </div>
                  </div>
                  <Badge className={`${statusConfig[app.status]?.className || "bg-slate-50 text-slate-600"} border text-[10px] font-semibold rounded-full px-2`}>
                    {app.status.toLowerCase()}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
