import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function PeriodsPage() {
  const session = await auth();
  const schoolId = (session?.user as any)?.schoolId;

  const periods = await prisma.period.findMany({
    where: { schoolId },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reporting Periods</h1>
          <p className="text-sm text-gray-500">{periods.length} periods defined</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          + New Period
        </button>
      </div>

      <div className="space-y-3">
        {periods.map((p) => (
          <div
            key={p.id}
            className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 ${
              p.isActive ? "border-indigo-300 ring-1 ring-indigo-200" : "border-gray-200"
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                {p.isActive && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    Active
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                  {p.type}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Start: {formatDate(p.startDate)}</span>
                <span>End: {formatDate(p.endDate)}</span>
                <span>Close: {formatDate(p.closeDate)}</span>
              </div>
            </div>
            {!p.isActive && (
              <button className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                Set Active
              </button>
            )}
          </div>
        ))}
        {periods.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">
            No reporting periods defined yet.
          </div>
        )}
      </div>
    </div>
  );
}
