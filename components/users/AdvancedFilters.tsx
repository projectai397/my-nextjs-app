"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AdvancedFiltersProps {
  onApplyFilters: (filters: any) => void;
  activeFiltersCount: number;
}

export default function AdvancedFilters({
  onApplyFilters,
  activeFiltersCount,
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState({
    balanceMin: "",
    balanceMax: "",
    plMin: "",
    plMax: "",
    status: "all",
    lastActivity: "all",
  });

  const handleApply = () => {
    onApplyFilters(filters);
  };

  const handleReset = () => {
    const resetFilters = {
      balanceMin: "",
      balanceMax: "",
      plMin: "",
      plMax: "",
      status: "all",
      lastActivity: "all",
    };
    setFilters(resetFilters);
    onApplyFilters(resetFilters);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Advanced Filters
          {activeFiltersCount > 0 && (
            <Badge
              variant="default"
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Advanced Filters</h4>
            {activeFiltersCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                className="h-8 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Balance Range</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.balanceMin}
                  onChange={(e) =>
                    setFilters({ ...filters, balanceMin: e.target.value })
                  }
                  className="h-8"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.balanceMax}
                  onChange={(e) =>
                    setFilters({ ...filters, balanceMax: e.target.value })
                  }
                  className="h-8"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">P/L Range</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.plMin}
                  onChange={(e) =>
                    setFilters({ ...filters, plMin: e.target.value })
                  }
                  className="h-8"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.plMax}
                  onChange={(e) =>
                    setFilters({ ...filters, plMax: e.target.value })
                  }
                  className="h-8"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value })
                }
              >
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Last Activity</Label>
              <Select
                value={filters.lastActivity}
                onValueChange={(value) =>
                  setFilters({ ...filters, lastActivity: value })
                }
              >
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="inactive">Inactive (30+ days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleApply} className="flex-1 h-8">
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
