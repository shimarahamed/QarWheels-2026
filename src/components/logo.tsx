import { cn } from '@/lib/utils';

export function Logo({ hideText = false, className }: { hideText?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5 group select-none', className)}>
      {/* Red circle with Q */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary shadow-md shadow-primary/30 transition-transform duration-200 group-hover:scale-105">
        <span className="font-headline text-lg font-black leading-none text-white">Q</span>
      </div>

      {!hideText && (
        <div className="flex flex-col leading-none">
          <span className="font-headline text-lg font-black tracking-tight text-foreground">QarWheel</span>
          <span className="text-[10px] font-medium text-muted-foreground tracking-wide">Your Car. Our Care.</span>
        </div>
      )}
    </div>
  );
}
