'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AuditLogTable } from './AuditLogTable';
import { getAuditLogs, getAuditMetadata, AuditFilterOptions } from '@/app/actions/audit';
import { 
  Search, 
  Filter, 
  Calendar, 
  User as UserIcon, 
  Activity, 
  RefreshCw,
  X,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface AuditLogContainerProps {
  initialLogs: any[];
  initialTotal: number;
  initialHasMore: boolean;
  initialMetadata: { actions: string[], entityTypes: string[] };
}

export const AuditLogContainer = ({
  initialLogs,
  initialTotal,
  initialHasMore,
  initialMetadata
}: AuditLogContainerProps) => {
  const [logs, setLogs] = useState<any[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [offset, setOffset] = useState(0);
  
  // Metadata for filters
  const [metadata, setMetadata] = useState<{ actions: string[], entityTypes: string[] }>(initialMetadata);

  // Filters state
  const [filters, setFilters] = useState<AuditFilterOptions>({
    limit: 50,
    offset: 0
  });

  const [showFilters, setShowFilters] = useState(false);



  const fetchLogs = useCallback(async (currentFilters: AuditFilterOptions, isLoadMore = false) => {
    if (isLoadMore) {
      setLoading(false); // Don't show full page loader for pagination
    } else {
      setLoading(true);
      setOffset(0);
    }

    try {
      const result = await getAuditLogs({
        ...currentFilters,
        offset: isLoadMore ? offset + (currentFilters.limit || 50) : 0
      });

      if (result.success && result.logs) {
        if (isLoadMore) {
          setLogs(prev => [...prev, ...result.logs]);
          setOffset(prev => prev + (currentFilters.limit || 50));
        } else {
          setLogs(result.logs);
          setOffset(0);
        }
        setTotal(result.total || 0);
        setHasMore(result.hasMore || false);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [offset]);



  const handleFilterChange = (key: keyof AuditFilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value, offset: 0 };
    setFilters(newFilters);
    fetchLogs(newFilters);
  };

  const resetFilters = () => {
    const defaultFilters = { limit: 50, offset: 0 };
    setFilters(defaultFilters);
    fetchLogs(defaultFilters);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs(filters);
  };

  return (
    <div className="space-y-6">
      {/* Search & Main Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input 
            type="text"
            placeholder="Search by Entity ID or User ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            onChange={(e) => handleFilterChange('entityId', e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium",
              showFilters 
                ? "bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20" 
                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
            )}
          >
            <Filter className="w-4 h-4" />
            Advanced Filters
            {Object.keys(filters).length > 2 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] text-white">
                {Object.keys(filters).length - 2}
              </span>
            )}
          </button>

          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 rounded-2xl bg-black/40 border border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-3 h-3" />
              Action Type
            </label>
            <select 
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={filters.action || ''}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            >
              <option value="">All Actions</option>
              {metadata.actions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-3 h-3" />
              Entity Type
            </label>
            <select 
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={filters.entityType || ''}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
            >
              <option value="">All Entities</option>
              {metadata.entityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Date From
            </label>
            <input 
              type="date"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={filters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Date To
            </label>
            <input 
              type="date"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>

          <div className="md:col-span-4 flex justify-end pt-2 border-t border-white/5">
            <button 
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
              Reset All Filters
            </button>
          </div>
        </div>
      )}

      {/* Main Table Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-white/40 text-sm font-medium">Scanning forensic logs...</p>
        </div>
      ) : (
        <AuditLogTable 
          logs={logs} 
          total={total} 
          hasMore={hasMore} 
          onLoadMore={() => fetchLogs(filters, true)} 
        />
      )}

      {/* Stats Summary Footer */}
      {!loading && logs.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10">
          <div className="text-xs text-white/40">
            Showing <span className="text-white font-bold">{logs.length}</span> of <span className="text-white font-bold">{total}</span> forensic records
          </div>
          <div className="text-[10px] uppercase tracking-widest text-indigo-400 font-black flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Immutable Audit System Active
          </div>
        </div>
      )}
    </div>
  );
};
