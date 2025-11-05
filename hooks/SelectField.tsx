"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SelectOption = { label: string; value: string };

type SelectFieldProps = {
  /** Optional label above the select */
  label?: string;
  /** Controlled value; pass a string from your options, or leave undefined for placeholder */
  value?: string;
  /** Called when value changes. Gives both raw value and the matched option object (or null) */
  onChange?: (value: string | undefined, option: SelectOption | null) => void;

  /** Options list (value must be non-empty strings) */
  options?: SelectOption[];
  /** Placeholder text when no value selected */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Message to show when options is empty */
  emptyText?: string;

  /** Styling hooks */
  className?: string;            // wrapper div
  triggerClassName?: string;     // <SelectTrigger/>
  contentClassName?: string;     // <SelectContent/>
  minWidth?: number | string;    // e.g. 200 or "16rem"

  /** Forwarded id for accessibility */
  id?: string;
};

export default function SelectField({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  disabled = false,
  emptyText = "No options",
  className,
  triggerClassName,
  contentClassName,
  minWidth = 200,
  id,
}: SelectFieldProps) {
  const handleChange = (val: string) => {
    const opt = options.find((o) => o.value === val) ?? null;
    onChange?.(val || undefined, opt);
  };

  return (
    <div
      className={cn("space-y-1", className)}
      style={{ minWidth: typeof minWidth === "number" ? `${minWidth}px` : minWidth }}
    >
      {label ? (
        <Label htmlFor={id} className="text-white">
          {label}
        </Label>
      ) : null}

      <Select
        value={value ?? undefined}             // use undefined to show placeholder
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={cn(
            // keep your dark theme styles
            "bg-[#2a2f36] text-white border-gray-700",
            // nicer focus outline
            "focus:ring-0 focus:outline-none focus-visible:ring-0",
            triggerClassName
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent
          className={cn(
            "bg-[#2a2f36] text-white border border-gray-700 max-h-72",
            contentClassName
          )}
        >
          {options.length === 0 ? (
            // Not a SelectItem → avoids Radix empty-string value errors
            <div className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</div>
          ) : (
            options.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                // 👇 override highlighted (hover/keyboard) style to WHITE (not green)
                className={cn(
                  "data-[highlighted]:bg-white data-[highlighted]:text-black",
                  "focus:bg-white focus:text-black"
                )}
              >
                {opt.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
