import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/types/api";

const statusMap: Record<DocumentStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  uploaded: {
    label: "uploadé",
    className: "bg-sky-50 text-sky-700 ring-sky-200",
    Icon: Clock3,
  },
  indexed: {
    label: "indexé",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Icon: CheckCircle2,
  },
  error: {
    label: "erreur",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
    Icon: AlertTriangle,
  },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const item = statusMap[status];
  const Icon = item.Icon;

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-semibold ring-1",
        item.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {item.label}
    </span>
  );
}
