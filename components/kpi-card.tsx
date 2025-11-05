"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

type ChangeType = "positive" | "negative" | "neutral";
type ValueFormat = "auto" | "compact" | "currency" | "raw";

interface KPICardProps {
  title: string;
  value: React.ReactNode;
  change?: number;
  changeType?: ChangeType;
  icon?: React.ReactNode;
  className?: string;
  description?: string;
  format?: ValueFormat;
  currency?: string;
  maximumFractionDigits?: number;
}

// ── Custom Indian Number Formatter ───────────────────────────────────────────
function formatIndianNumber(value: number, maximumFractionDigits = 2): string {
  if (isNaN(value)) return "0";

  const absVal = Math.abs(value);

  if (absVal >= 1_00_00_000) {
    // 1 crore = 1e7
    return (
      (value / 1_00_00_000).toFixed(maximumFractionDigits).replace(/\.00$/, "") +
      " Cr"
    );
  } else if (absVal >= 1_00_000) {
    // 1 lakh = 1e5
    return (
      (value / 1_00_000).toFixed(maximumFractionDigits).replace(/\.00$/, "") +
      " L"
    );
  } else {
    // Below 1 lakh → normal comma style
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits,
    }).format(value);
  }
}

// ── Main Format Logic (keeps currency support etc.) ──────────────────────────
function formatNumberValue(
  value: number,
  format: ValueFormat,
  currency?: string,
  maximumFractionDigits = 2
) {
  if (format === "currency" && currency) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits,
    }).format(value);
  }

  if (format === "compact" || format === "auto") {
    const useCompact = format === "compact" || Math.abs(value) >= 1_00_000;
    if (useCompact) {
      // use Indian format instead of Intl compact
      return formatIndianNumber(value, maximumFractionDigits);
    }
  }

  return new Intl.NumberFormat("en-IN", { maximumFractionDigits }).format(value);
}

// ── KPI Card Component ──────────────────────────────────────────────────────
export function KPICard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  className,
  description,
  format = "auto",
  currency,
  maximumFractionDigits = 2,
}: KPICardProps) {
  const displayValue =
    typeof value === "number"
      ? formatNumberValue(value, format, currency, maximumFractionDigits)
      : value;

  const titleAttr =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
      ? value
      : undefined;

  const formatChange = (c: number) => `${c > 0 ? "+" : ""}${c.toFixed(2)}%`;

  return (
    <Card
      className={cn(
        "bg-[#1e2329] border-[#2a2f36] rounded-xl p-4",
        "shadow-sm",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0">
        <CardTitle className="text-sm font-medium text-[#fcd535]">
          {title}
        </CardTitle>
        {icon && <div className="text-[#fcd535] shrink-0">{icon}</div>}
      </CardHeader>

      <CardContent className="min-w-0 p-0 mt-2">
        <div
          className={cn(
            "text-2xl font-semibold text-white mb-1",
            "whitespace-nowrap overflow-hidden truncate",
            "tabular-nums"
          )}
          title={titleAttr}
        >
          {displayValue}
        </div>

        {typeof change === "number" && (
          <div
            className={cn(
              "flex items-center text-xs font-medium space-x-1",
              changeType === "positive" && "text-green-400",
              changeType === "negative" && "text-red-400",
              changeType === "neutral" && "text-[#848E9C]"
            )}
          >
            {changeType === "positive" && <TrendingUp className="h-3 w-3" />}
            {changeType === "negative" && <TrendingDown className="h-3 w-3" />}
            <span className="whitespace-nowrap">{formatChange(change)}</span>
            {description && (
              <span className="text-[#848E9C]">{description}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default KPICard;
