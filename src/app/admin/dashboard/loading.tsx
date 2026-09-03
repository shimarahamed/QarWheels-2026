import { Skeleton } from "@/components/ui/skeleton";
import { LoadingPanel } from "@/components/ui/empty-state";

export default function AdminDashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <LoadingPanel rows={4} />
    </div>
  );
}
