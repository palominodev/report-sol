export default function DashboardChartsSkeleton() {
  return (
    <div className="space-y-6 mb-6">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse h-[300px]" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse h-[250px]" />
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse h-[250px]" />
      </div>
    </div>
  );
}
