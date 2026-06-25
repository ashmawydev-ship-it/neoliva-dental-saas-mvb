"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, Sparkles, Search, Filter, 
  MoreVertical, Edit2, Trash2, LayoutGrid,
  SearchX
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { deleteServiceAction } from "@/app/actions/services";
import { EditServiceDialog } from "./EditServiceDialog";
import { toast } from "sonner";
import { $Enums } from "@/generated/client";
type ServiceCategory = $Enums.ServiceCategory;
const ServiceCategory = $Enums.ServiceCategory;

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  category: ServiceCategory;
  popular: boolean | null;
}

interface ServicesViewProps {
  initialServices: Service[];
}

const categoryColors: Record<ServiceCategory, string> = {
  PREVENTIVE: "bg-emerald-50 text-emerald-700 border-emerald-100",
  RESTORATIVE: "bg-blue-50 text-blue-700 border-blue-100",
  SURGICAL: "bg-red-50 text-red-700 border-red-100",
  ORTHODONTICS: "bg-amber-50 text-amber-700 border-amber-100",
};

const categoryIcons: Record<ServiceCategory, string> = {
  PREVENTIVE: "🪥",
  RESTORATIVE: "🦷",
  SURGICAL: "🔩",
  ORTHODONTICS: "📋",
};

export function ServicesView({ initialServices }: ServicesViewProps) {
  const t = useTranslations('services');
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | "ALL">("ALL");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const filteredServices = initialServices.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(search.toLowerCase()) ||
                         service.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "ALL" || service.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  async function handleDelete(id: string) {
    if (!confirm(t('dialog.confirmDelete'))) return;

    try {
      const result = await deleteServiceAction(id);
      if (result.success) {
        toast.success(t('toast.deleteSuccess'));
      } else {
        toast.error(result.error || t('toast.deleteError'));
      }
    } catch (error) {
      toast.error(t('toast.error'));
    }
  }

  const handleEditClick = (service: Service) => {
    setEditingService(service);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder={t('searchPlaceholder')} 
            className="pl-10 bg-gray-50 border-0 focus-visible:ring-indigo-500 rounded-xl h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <Button
            variant={categoryFilter === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("ALL")}
            className={`rounded-xl px-4 h-9 text-xs font-medium ${
              categoryFilter === "ALL" ? "bg-indigo-600 text-white" : "text-gray-600 border-gray-200"
            }`}
          >
            {t('filterAll')}
          </Button>
          {Object.values(ServiceCategory).map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-xl px-4 h-9 text-xs font-medium ${
                categoryFilter === cat ? "bg-indigo-600 text-white" : "text-gray-600 border-gray-200"
              }`}
            >
              {t.has(`categories.${cat}`) ? t(`categories.${cat}`) : (cat.charAt(0) + cat.slice(1).toLowerCase())}
            </Button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
            <SearchX className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">{t('dialog.noServicesFound')}</p>
          <Button 
            variant="link" 
            className="text-indigo-600"
            onClick={() => { setSearch(""); setCategoryFilter("ALL"); }}
          >
            {t('actions.clearFilters')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 stagger-children">
          {filteredServices.map((service) => (
            <Card key={service.id} className="border-0 shadow-sm card-hover overflow-hidden group relative bg-white">
              {service.popular && (
                <div className="absolute top-4 right-12 z-10">
                  <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-none text-[10px] font-bold rounded-full px-2 shadow-sm">
                    <Sparkles className="w-2.5 h-2.5 mr-1" /> {t('table.popular')}
                  </Badge>
                </div>
              )}

              <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-gray-100">
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl border-gray-100 shadow-xl">
                    <DropdownMenuItem 
                      className="text-gray-600 focus:text-indigo-600 cursor-pointer rounded-lg"
                      onClick={() => handleEditClick(service)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" /> {t('actions.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600 focus:text-red-700 cursor-pointer rounded-lg"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> {t('actions.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                    {categoryIcons[service.category] || "🦷"}
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                      {service.description || t('form.noDescription')}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" /> {service.duration} {t('form.minute')}
                    </div>
                    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-bold rounded-full border px-2.5 py-0.5 ${categoryColors[service.category] || 'bg-gray-50 text-gray-700'}`}>
                      {t.has(`categories.${service.category}`) ? t(`categories.${service.category}`) : service.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-gray-900">${service.price}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <EditServiceDialog 
        service={editingService}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  );
}
