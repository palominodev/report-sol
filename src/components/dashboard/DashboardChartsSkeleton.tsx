export default function DashboardChartsSkeleton() {
  return (
    <div className="space-y-6 mb-6">
      <div className="bg-nav border border-line animate-pulse h-[300px]" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-nav border border-line animate-pulse h-[250px]" />
        <div className="bg-nav border border-line animate-pulse h-[250px]" />
      </div>
    </div>
  );
}
