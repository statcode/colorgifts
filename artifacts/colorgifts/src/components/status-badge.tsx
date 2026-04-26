import { cn } from "@/lib/utils";
import { BookStatus } from "@workspace/api-client-react";
import { Loader2, CheckCircle2, FileEdit, Package } from "lucide-react";

interface StatusBadgeProps {
  status: typeof BookStatus[keyof typeof BookStatus];
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status) {
    case BookStatus.draft:
      return (
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300", className)}>
          <FileEdit className="w-3.5 h-3.5" />
          <span>Draft</span>
        </div>
      );
    case BookStatus.generating:
      return (
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300 animate-pulse", className)}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Generating</span>
        </div>
      );
    case BookStatus.ready:
      return (
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300", className)}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Ready</span>
        </div>
      );
    case BookStatus.ordered:
      return (
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300", className)}>
          <Package className="w-3.5 h-3.5" />
          <span>Ordered</span>
        </div>
      );
    default:
      return null;
  }
}
