import { getEvents, replayEvent } from '@/app/actions/events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { format } from 'date-fns';
import { 
  Activity, 
  Play, 
  Info, 
  ShieldCheck, 
  Zap, 
  AlertTriangle, 
  AlertCircle, 
  PlusCircle, 
  CheckCircle2,
  Clock
} from 'lucide-react';

export default async function EventsDebugPage() {
  const events = await getEvents();
  
  const alerts = events.filter(e => e.eventType === 'SYSTEM_ALERT');

  const getEventBadgeProps = (eventType: string) => {
    if (eventType === 'SYSTEM_ALERT') return { variant: 'warning' as const, icon: AlertTriangle, color: 'text-amber-500' };
    if (eventType === 'SECURITY_DENIED') return { variant: 'destructive' as const, icon: ShieldCheck, color: 'text-rose-500' };
    if (eventType.includes('ERROR')) return { variant: 'destructive' as const, icon: AlertCircle, color: 'text-rose-500' };
    
    // Derived Events
    if (eventType === 'PATIENT_NO_SHOW') return { variant: 'destructive' as const, icon: AlertCircle, color: 'text-rose-600' };
    if (eventType === 'INVOICE_OVERDUE') return { variant: 'warning' as const, icon: Clock, color: 'text-amber-600' };
    if (eventType === 'TREATMENT_DELAYED') return { variant: 'warning' as const, icon: AlertTriangle, color: 'text-orange-600' };

    if (eventType.includes('CREATED') || eventType.includes('ADDED')) return { variant: 'success' as const, icon: PlusCircle, color: 'text-emerald-500' };
    if (eventType.includes('COMPLETED') || eventType.includes('PAID')) return { variant: 'default' as const, icon: CheckCircle2, color: 'text-blue-500' };
    return { variant: 'secondary' as const, icon: Clock, color: 'text-slate-500' };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Event Debugger</h1>
          <p className="text-muted-foreground">
            Inspect, validate, and simulate system events in real-time.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="flex gap-1 items-center px-3 py-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Validation Active
          </Badge>
          <Badge variant="outline" className="flex gap-1 items-center px-3 py-1">
            <Zap className="w-4 h-4 text-amber-500" />
            Derived Engine Online
          </Badge>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
          <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-900/10 dark:border-amber-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-600 dark:text-amber-400 flex items-center gap-2 text-base">
                <AlertTriangle className="w-5 h-5" />
                Active System Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.slice(0, 3).map(alert => (
                  <div key={alert.id} className="text-sm flex justify-between items-center p-2 rounded-lg bg-background/50 border border-amber-100 dark:border-amber-900/30">
                    <span className="font-medium">{(alert.metadata as any)?.message}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(alert.createdAt), 'HH:mm:ss')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-background to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground">Last 100 events tracked</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Live Event Stream
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const { variant, icon: Icon, color } = getEventBadgeProps(event.eventType);
                return (
                  <TableRow key={event.id} className="group">
                    <TableCell>
                      <Badge variant={variant} className="flex gap-1 items-center w-fit">
                        <Icon className={`w-3 h-3 ${color}`} />
                        {event.eventType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">{event.entityType}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{event.entityId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold">
                          {((event as any).user?.memberships?.[0]?.staffProfile?.name || 'S').charAt(0)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {(event as any).user?.memberships?.[0]?.staffProfile?.name || 'System'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs">{format(new Date(event.createdAt), 'MMM d, HH:mm:ss')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => alert(JSON.stringify(event.metadata, null, 2))}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={replayEvent.bind(null, event.id) as any}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-3 h-3 mr-2" />
                          Replay
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
