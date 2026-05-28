import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "navy" | "emerald" | "amber" | "plum";
};

const tones: Record<StatCardProps["tone"], string> = {
  navy: "bg-[#14213d] text-white",
  emerald: "bg-[#e9f5ef] text-[#156348]",
  amber: "bg-[#fff1d6] text-[#945f09]",
  plum: "bg-[#f3e8ff] text-[#6d3a9c]",
};

export function StatCard({ label, value, detail, icon: Icon, tone }: StatCardProps) {
  return (
    <div className="rounded-lg border border-[#ded8ce] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#6f7888]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[#172033]">{value}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#6f7888]">{detail}</p>
    </div>
  );
}
