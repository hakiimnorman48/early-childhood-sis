import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { scoreToCode, scoreToColor } from "@/lib/utils";
import Link from "next/link";
import { Pencil } from "lucide-react";

export default async function GradebookPage() {
  const session = await auth();
  const teacherId = (session?.user as any)?.id;
  const schoolId = (session?.user as any)?.schoolId;

  const activePeriod = await prisma.period.findFirst({
    where: { schoolId, isActive: true },
  });

  if (!activePeriod) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Gradebook</h1>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-orange-700">
          No active reporting period. Ask your admin to activate a period.
        </div>
      </div>
    );
  }

  const myClasses = await prisma.classTeacher.findMany({
    where: { teacherId },
    include: { class: true },
  });

  const myDomains = await prisma.domainAssignment.findMany({
    where: { teacherId, periodId: activePeriod.id },
    include: {
      competencyArea: {
        include: { skills: { orderBy: { order: "asc" } } },
      },
      class: {
        include: {
          students: { orderBy: { fullName: "asc" } },
        },
      },
    },
  });

  const allStudentIds = Array.from(
    new Set(myDomains.flatMap((d) => d.class.students.map((s) => s.id)))
  );

  const allEntries = await prisma.progressEntry.findMany({
    where: { studentId: { in: allStudentIds }, periodId: activePeriod.id },
  });

  const entryMap: Record<string, Record<string, { score: number; code: string | null; isDraft: boolean }>> = {};
  for (const e of allEntries) {
    if (!entryMap[e.studentId]) entryMap[e.studentId] = {};
    entryMap[e.studentId][e.skillId] = { score: e.score, code: e.mappedCode, isDraft: e.isDraft };
  }

  const summaries = await prisma.studentPeriodSummary.findMany({
    where: { studentId: { in: allStudentIds }, periodId: activePeriod.id },
  });
  const summaryMap = Object.fromEntries(summaries.map((s) => [s.studentId, s]));

  const colorClass: Record<string, string> = {
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Gradebook</h1>
        <p className="text-sm text-gray-500">Period: <span className="font-medium text-indigo-600">{activePeriod.name}</span></p>
      </div>

      {myDomains.length === 0 && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-400">
          No domains assigned to you for this period.
        </div>
      )}

      {myDomains.map((domain) => {
        const { competencyArea, class: cls } = domain;
        const students = cls.students;
        const skills = competencyArea.skills;

        return (
          <div key={domain.id} className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50">
              <div>
                <h2 className="font-semibold text-gray-900">{competencyArea.name}</h2>
                <p className="text-xs text-gray-500">{cls.name} · {skills.length} indicators</p>
              </div>
              <span className="text-xs text-indigo-600 font-medium">{students.length} students</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-gray-500 sticky left-0 bg-gray-50 min-w-[160px]">Student</th>
                    {skills.map((skill) => (
                      <th key={skill.id} className="text-center px-2 py-2 font-medium text-gray-500 min-w-[80px] leading-tight">
                        {skill.name.length > 20 ? skill.name.slice(0, 18) + "…" : skill.name}
                      </th>
                    ))}
                    <th className="text-center px-3 py-2 font-semibold text-gray-500 min-w-[70px]">Avg</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-500 min-w-[80px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((student) => {
                    const studentEntries = entryMap[student.id] ?? {};
                    const domainScores = skills
                      .map((sk) => studentEntries[sk.id]?.score)
                      .filter((s): s is number => s !== undefined);
                    const avg = domainScores.length
                      ? domainScores.reduce((a, b) => a + b, 0) / domainScores.length
                      : null;
                    const summary = summaryMap[student.id];
                    const hasSummaryComment = !!summary?.overallComment;

                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 sticky left-0 bg-white font-medium text-gray-800">
                          <div className="flex items-center gap-2">
                            <span>{student.fullName}</span>
                            <Link
                              href={`/teacher/students/${student.id}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
                            >
                              <Pencil size={10} />
                              Grade
                            </Link>
                          </div>
                        </td>
                        {skills.map((skill) => {
                          const entry = studentEntries[skill.id];
                          const score = entry?.score;
                          return (
                            <td key={skill.id} className="text-center px-2 py-2">
                              {score !== undefined ? (
                                <span className={`inline-flex items-center justify-center w-10 h-7 rounded font-semibold text-xs ${colorClass[scoreToColor(score)]}`}>
                                  {scoreToCode(score)}
                                  <span className="sr-only">{score}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-10 h-7 rounded bg-gray-100 text-gray-400">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-center px-3 py-2">
                          {avg !== null ? (
                            <span className={`font-bold ${colorClass[scoreToColor(avg)]} px-2 py-0.5 rounded text-xs`}>
                              {avg.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="text-center px-3 py-2">
                          {hasSummaryComment ? (
                            summary.isPublished ? (
                              <span className="text-green-600 font-medium">Published</span>
                            ) : (
                              <span className="text-yellow-600">Draft</span>
                            )
                          ) : (
                            <span className="text-red-500">Missing comment</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex gap-3 justify-end bg-gray-50">
              <button className="px-4 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                Save Draft
              </button>
              <button className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Mark Domain Complete
              </button>
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
        <span className="font-medium text-gray-600">Scale:</span>
        {[
          { code: "P", label: "Pengenalan (0–3)", cls: "bg-red-100 text-red-700" },
          { code: "C", label: "Cukup (4–6)", cls: "bg-yellow-100 text-yellow-700" },
          { code: "B", label: "Baik (7–10)", cls: "bg-green-100 text-green-700" },
        ].map((l) => (
          <div key={l.code} className="flex items-center gap-1.5">
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${l.cls}`}>{l.code}</span>
            <span>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
