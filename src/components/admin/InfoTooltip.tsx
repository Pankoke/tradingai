import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/src/components/ui/tooltip";

type InfoTooltipProps = {
  label?: string;
  text: string;
  className?: string;
};

export function InfoTooltip({ label, text, className }: InfoTooltipProps) {
  return (
    <Tooltip
      content={<p className="text-slate-100">{text}</p>}
      className="z-40"
      contentClassName="text-slate-100"
    >
      <span
        aria-label={label ?? "Info"}
        className={cn(
          "inline-flex cursor-help items-center justify-center rounded-full bg-slate-800 p-1 text-slate-200 hover:bg-slate-700",
          className,
        )}
      >
        <Info className="h-3 w-3" />
      </span>
    </Tooltip>
  );
}
