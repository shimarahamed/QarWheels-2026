export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center font-bold text-primary-foreground text-4xl font-headline">
        Q
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-2xl font-headline leading-none">QarWheels</span>
        <span className="text-xs text-muted-foreground leading-none mt-1">Automotive Intelligence for Qatar</span>
      </div>
    </div>
  );
}
