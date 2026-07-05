'use client';

import * as React from "react";
import { Check, ChevronsUpDown, Clock, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getServices } from "@/app/actions/services";
import { Badge } from "@/components/ui/badge";

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number | null;
  category: string;
}

interface ServiceComboboxProps {
  onSelect: (service: Service) => void;
  selectedServiceId?: string;
  className?: string;
}

export function ServiceCombobox({ 
  onSelect, 
  selectedServiceId,
  className 
}: ServiceComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [services, setServices] = React.useState<Service[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadServices() {
      try {
        const data = await getServices();
        setServices(data as any);
      } catch (error) {
        console.error("Failed to load services:", error);
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, []);

  const selectedService = services.find((s) => s.id === selectedServiceId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-11 px-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border-gray-200 dark:border-slate-700 rounded-xl transition-all duration-200",
            selectedService && "border-primary/30 bg-primary/5",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {selectedService ? (
              <>
                <span className="font-medium text-gray-900 dark:text-white">{selectedService.name}</span>
                <Badge variant="secondary" className="text-[10px] h-5 bg-white/50 text-primary border-primary/10">
                  {selectedService.category}
                </Badge>
              </>
            ) : (
              <span className="text-muted-foreground">Select dental service...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start" sideOffset={8}>
        <Command className="rounded-xl border dark:border-slate-800 shadow-lg overflow-hidden dark:bg-slate-900">
          <div className="flex items-center border-b px-3">
            <CommandInput 
              placeholder="Search services, categories..." 
              className="h-11 border-none focus:ring-0"
            />
          </div>
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              No dental services found.
            </CommandEmpty>
            <CommandGroup>
              {services.map((service) => (
                <CommandItem
                  key={service.id}
                  value={`${service.name} ${service.category}`}
                  data-testid={`inventory-item-${service.id}`}
                  onSelect={() => {
                    onSelect(service);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between py-3 px-4 cursor-pointer aria-selected:bg-primary/5 aria-selected:text-primary transition-colors"
                >
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{service.name}</span>
                      {selectedServiceId === service.id && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {service.category}
                      </span>
                      {service.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {service.duration} mins
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      ${Number(service.price).toLocaleString()}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
