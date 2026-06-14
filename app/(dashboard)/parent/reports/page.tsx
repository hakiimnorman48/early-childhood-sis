import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function ReportsPage() {
  const session = await auth();
  const parentId = (session?.user as any)?.id;

  const parentStudents = await prisma.parentStudent.findMany({
    where: { parentId },
    include: {
      student: {
        include: {
          class: true,
          studentPeriodSummaries: {
            where: { isPublished: true },
            include: { period: true },
            orderBy: { period: { startDate: "desc" } },
          },
        },
      },
    },
  });

  if (parentStudents.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Reports</h1>
        <p className="text-gray-400">No children linked to your account.</p>
      </div>
    );
  }

  const student = parentStudents[0].student;
  const summaries = student.studentPeriodSummaries;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">{student.fullName} · {student.class.name}</p>
      </div>

      {summaries.length === 0 ? (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-400">
          No published reports yet. Your teacher will notify you when reports are ready.
        </div>
      ) : (
        <div className="space-y-4">
          {summaries.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-gray-900">{s.period.name}</h2>
                  <p className="text-xs text-gray-400">
                    Published {s.publishedAt ? formatDate(s.publishedAt) : "—"}
                  </p>
                </div>
                <Link
                  href={`/parent/reports/view/${s.periodId}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100 transition-colors"
                >
                  📄 View &amp; Print
                </Link>
              </div>
              {s.overallComment && (
                <p className="text-sm text-gray-700 italic border-l-4 border-indigo-200 pl-3">
                  "{s.overallComment}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
