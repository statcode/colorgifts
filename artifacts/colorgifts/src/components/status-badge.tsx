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
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border", className)}>
          <FileEdit className="w-3.5 h-3.5" />
          <span>Draft</span>
        </div>
      );
    case BookStatus.generating:
      return (
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent-foreground border border-accent/30 animate-pulse", className)}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Generating</span>
        </div>
      );
    case BookStatus.ready:
      return (
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary/20 text-secondary-foreground border border-secondary/30", className)}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Ready</span>
        </div>
      );
    case BookStatus.ordered:
      return (
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20", className)}>
          <Package className="w-3.5 h-3.5" />
          <span>Ordered</span>
        </div>
      );
    default:
      return null;
  }
}
