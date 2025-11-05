"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Download,
  ToggleLeft,
  Mail,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface BulkOperationsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkExport: () => void;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
  onBulkEmail: () => void;
}

export default function BulkOperationsBar({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkExport,
  onBulkActivate,
  onBulkDeactivate,
  onBulkEmail,
}: BulkOperationsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-card border border-border rounded-lg shadow-2xl p-4 flex items-center gap-4 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-primary text-primary-foreground">
            {selectedCount} Selected
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onBulkActivate}
            className="h-8 hover:bg-green-500/10 hover:text-green-500"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Activate
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onBulkDeactivate}
            className="h-8 hover:bg-yellow-500/10 hover:text-yellow-500"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Deactivate
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onBulkEmail}
            className="h-8 hover:bg-blue-500/10 hover:text-blue-500"
          >
            <Mail className="h-4 w-4 mr-1" />
            Email
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onBulkExport}
            className="h-8 hover:bg-purple-500/10 hover:text-purple-500"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>

          <div className="h-6 w-px bg-border" />

          <Button
            size="sm"
            variant="ghost"
            onClick={onBulkDelete}
            className="h-8 hover:bg-red-500/10 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
