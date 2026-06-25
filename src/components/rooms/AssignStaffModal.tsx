"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignRoomStaffAction, removeRoomStaffAction, getStaffOptionsAction } from "@/app/actions/rooms";
import { Trash2, Loader2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AssignStaffModal({ 
  roomId,
  roomName,
  currentStaff,
  isOpen, 
  onClose 
}: { 
  roomId: string;
  roomName: string;
  currentStaff: any[];
  isOpen: boolean; 
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffOptions, setStaffOptions] = useState<any[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  // Form states
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("DOCTOR");

  useEffect(() => {
    if (isOpen) {
      loadStaffOptions();
    }
  }, [isOpen]);

  const loadStaffOptions = async () => {
    setIsLoadingStaff(true);
    try {
      const res = await getStaffOptionsAction();
      if (res.success && res.data) {
        setStaffOptions(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast.error("Please select a staff member");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await assignRoomStaffAction({
        roomId,
        userId: selectedUserId,
        role: selectedRole
      });
      
      if (result.success) {
        toast.success("Staff assigned successfully");
        setSelectedUserId("");
        // No need to close, let them assign more
      } else {
        toast.error(result.error || "Failed to assign staff");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      const result = await removeRoomStaffAction(roomId, userId);
      if (result.success) {
        toast.success("Staff removed");
      } else {
        toast.error(result.error || "Failed to remove staff");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  const availableStaff = staffOptions.filter(
    (s) => !currentStaff.some((cs) => cs.userId === s.userId)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Staff - {roomName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Staff List */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Current Assignments</h4>
            {currentStaff.length === 0 ? (
              <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md text-center">
                No staff currently assigned to this room.
              </div>
            ) : (
              <div className="space-y-2">
                {currentStaff.map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between bg-card border p-2.5 rounded-lg shadow-sm">
                    <div>
                      <p className="text-sm font-medium">
                        {staff.user?.memberships?.[0]?.staffProfile?.name || staff.user?.email || 'Unknown User'}
                      </p>
                      <Badge variant="secondary" className="text-[10px] mt-1">{staff.role}</Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                      onClick={() => handleRemove(staff.userId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Assign New Staff</h4>
            
            {isLoadingStaff ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Select Staff</label>
                  <Select value={selectedUserId} onValueChange={(val) => setSelectedUserId(val ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Search and select staff..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStaff.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No available staff</div>
                      ) : (
                        availableStaff.map((s) => (
                          <SelectItem key={s.userId} value={s.userId}>
                            {s.name} ({s.role.replace('_', ' ')})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Assign Role</label>
                  <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOCTOR">Doctor</SelectItem>
                      <SelectItem value="ASSISTANT">Assistant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleAssign} 
                  disabled={!selectedUserId || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Assign Staff
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
