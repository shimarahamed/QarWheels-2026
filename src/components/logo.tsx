import { cn } from "@/lib/utils"

export function Logo({ hideText = false }: { hideText?: boolean }) {
  return (
    <div className="flex items-center gap-3 group">
      <div className={cn(
        "w-10 h-10 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-3xl font-headline"
      )}>
        Q
      </div>
      {!hideText && (
        <div className="flex flex-col">
            <span className="font-bold text-xl font-headline leading-none text-foreground">QarWheels</span>
            <span className="text-xs text-muted-foreground leading-none mt-1">Automotive Intelligence</span>
        </div>
      )}
    </div>
  );
}
