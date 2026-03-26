export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-64 bg-gray-200 rounded-xl" />
          <div className="h-4 w-48 bg-gray-100 rounded-lg mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-28 bg-gray-100 rounded-full" />
          <div className="h-7 w-20 bg-gray-100 rounded-full" />
        </div>
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-[130px] bg-white rounded-3xl shadow-sm border border-gray-50 p-6">
            <div className="h-3 w-24 bg-gray-100 rounded mb-4" />
            <div className="h-8 w-32 bg-gray-200 rounded-lg" />
            <div className="h-3 w-20 bg-gray-50 rounded mt-3" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="h-[430px] bg-white rounded-3xl shadow-sm border border-gray-50 p-6">
        <div className="h-5 w-32 bg-gray-100 rounded mb-6" />
        <div className="h-full bg-gray-50 rounded-2xl" />
      </div>

      {/* Bottom grid skeleton */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 h-[300px] bg-white rounded-3xl shadow-sm border border-gray-50 p-6">
          <div className="h-5 w-32 bg-gray-100 rounded mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-50 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="h-[300px] bg-white rounded-3xl shadow-sm border border-gray-50 p-6">
          <div className="h-5 w-24 bg-gray-100 rounded mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-50 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
