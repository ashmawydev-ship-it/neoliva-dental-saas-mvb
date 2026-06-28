'use client';

import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DollarSign } from "lucide-react";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  prefix?: string | React.ReactNode;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0.00",
  className,
  disabled = false,
  prefix = <DollarSign className="w-3.5 h-3.5" />
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(value > 0 ? value.toString() : '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Synchronize if parent value changes externally (e.g. auto-fill)
    const currentNum = parseFloat(displayValue) || 0;
    if (value !== currentNum) {
      if (value === 0) {
        setDisplayValue('');
      } else {
        setDisplayValue(value.toString());
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Allow only numbers and a single decimal point
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setDisplayValue(val);
      const numValue = parseFloat(val);
      onChange(isNaN(numValue) ? 0 : numValue);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format to 2 decimal places on blur if needed
    if (displayValue !== '') {
      const numValue = parseFloat(displayValue);
      if (!isNaN(numValue)) {
        setDisplayValue(numValue.toFixed(2));
      }
    }
  };

  return (
    <div className={cn(
      "relative group transition-all duration-200",
      isFocused ? "scale-[1.02]" : "scale-100"
    )}>
      <div className={cn(
        "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-200 pointer-events-none flex items-center justify-center",
        isFocused ? "text-primary" : "text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-300"
      )}>
        {prefix}
      </div>
      <Input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "pl-8 h-11 border-gray-200 rounded-xl transition-all duration-200",
          "focus-visible:ring-primary/20 focus-visible:border-primary",
          "placeholder:text-gray-300 dark:placeholder:text-slate-500 font-medium text-gray-900 dark:text-white dark:bg-slate-800 dark:border-slate-700",
          className
        )}
      />
      {displayValue !== '' && !disabled && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary/40 pointer-events-none uppercase tracking-wider">
          EGP
        </div>
      )}
    </div>
  );
}
