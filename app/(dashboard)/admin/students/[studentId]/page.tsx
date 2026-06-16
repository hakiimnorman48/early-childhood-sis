import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

const PCB_STYLE: Record<string, string> = {
  P: "bg-red-100 text-red-700 font-bold",
  C: "bg-yellow-100 text-yellow-700 font-bold",
  B: "bg-green-100 text-green-700 font-bold",
};

const ENGLISH_LEVELS: Record<string, Array<{ code: string; text: string }>> = {
  Speaking: [
    { code: "a", text: "Body language." },
    { code: "b", text: "One or two words." },
    { code: "c", text: "Short sentence." },
  ],
  Listening: [
    { code: "a", text: "No respond." },
    { code: "b", text: "Initiates to respond." },
    { code: "c", text: "Responds appropriately." },
  ],
  Reading: [
    { code: "a", text: "Enjoys book or being read to." },
    { code: "b", text: "Looks at symbol or picture." },
    { code: "c", text: "Picture read." },
    { code: "d", text: "Retell the story with her/his words." },
  ],
  Singing: [
    { code: "a", text: "Listens to the song." },
    { code: "b", text: "Follows to sing the song." },
    { code: "c", text: "Sing the song." },
  ],
};

export default async function AdminStudentGradingPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "admin") redirect("/admin");

  const { studentId } = await params;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: {
        include: {
          classTeachers: {
            include: { teacher: { select: { name: true } } },
            orderBy: { isHomeroom: "desc" },
          },
        },
      },
      school: { select: { name: true } },
    },
  });

  if (!student) return notFound();

  const activePeriod = await prisma.period.findFirst({
    where: { schoolId: student.schoolId, isActive: true },
  });

  if (!activePeriod) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/admin/students" className="inline-flex items-center gap-2 text-sm text-gray-500 mb-6">
          <ArrowLeft size={16} /> Back to Students
        </Link>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-orange-700 text-sm">
          No active grading period. Go to Grading Periods and activate one first.
        </div>
      </div>
    );
  }

  const [allDomains, entries, summary, completions] = await Promise.all([
    prisma.domainAssignment.findMany({
      where: { classId: student.classId, periodId: activePeriod.id },
      include: {
        competencyArea: { include: { skills: { orderBy: { order: "asc" } } } },
        teacher: { select: { name: true } },
      },
    }),
    prisma.progressEntry.findMany({
      where: { studentId, periodId: activePeriod.id },
    }),
    prisma.studentPeriodSummary.findUnique({
      where: { studentId_periodId: { studentId, periodId: activePeriod.id } },
    }),
    prisma.domainCompletion.findMany({
      where: { studentId, periodId: activePeriod.id },
    }),
  ]);

  allDomains.sort((a, b) => a.competencyArea.order - b.competencyArea.order);

  const entryMap = Object.fromEntries(
    entries.map((e) => [e.skillId, { score: e.score, mappedCode: e.mappedCode, narrative: e.narrativeComment }])
  );

  const completedAreaIds = new Set(completions.map((c) => c.competencyAreaId));

  const standardDomains = allDomains.filter((d) => !d.competencyArea.customScale);
  const englishDomain = allDomains.find((d) => d.competencyArea.customScale);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin/students" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Back to Students
        </Link>
        <Link
          href={`/teacher/students/${studentId}/report-card`}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FileText size={16} />
          Preview &amp; Export Report Card
        </Link>
      </div>

      {/* Student card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{student.fullName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {student.class.name} · Period:{" "}
              <span className="text-indigo-600 font-medium">{activePeriod.name}</span>
            </p>
          </div>
          {summary?.isPublished ? (
            <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
              Published to parent
            </span>
          ) : summary ? (
            <span className="px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
              Draft
            </span>
          ) : (
            <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
              Not started
            </span>
          )}
        </div>
        {summary?.overallComment && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Overall Summary</p>
            <p className="text-sm text-gray-700 italic">"{summary.overallComment}"</p>
          </div>
        )}
      </div>

      {/* Domain-by-domain grading view */}
      <div className="space-y-4">
        {standardDomains.map((d, idx) => {
          const area = d.competencyArea;
          const isComplete = completedAreaIds.has(area.id);
          const firstSkillId = area.skills[0]?.id;
          const domainNarrative = firstSkillId ? (entryMap[firstSkillId]?.narrative ?? null) : null;
          const gradedCount = area.skills.filter((s) => entryMap[s.id]?.mappedCode).length;

          return (
            <div key={d.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className={`px-5 py-3 border-b flex items-center justify-between ${isComplete ? "bg-green-50 border-green-100" : "bg-indigo-50 border-indigo-100"}`}>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {idx + 1}. {area.name}
                    {isComplete && <span className="ml-2 text-xs text-green-600 font-medium">✓ Domain complete</span>}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Teacher: {d.teacher.name} · {gradedCount}/{area.skills.length} graded
                  </p>
                </div>
              </div>
              {domainNarrative && (
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 text-sm text-gray-700">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Keterangan guru: </span>
                  {domainNarrative}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-500 w-8">#</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Indikator</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-500 w-16">Score</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-500 w-16">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {area.skills.map((skill) => {
                      const entry = entryMap[skill.id];
                      const code = entry?.mappedCode ?? null;
                      return (
                        <tr key={skill.id} className="hover:bg-gray-50/70">
                          <td className="px-4 py-2 text-gray-400 text-xs">{skill.order}</td>
                          <td className="px-3 py-2 text-gray-700">{skill.name}</td>
                          <td className="px-3 py-2 text-center text-xs text-gray-500">
                            {entry ? entry.score : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {code ? (
                              <span className={`px-2 py-0.5 rounded text-xs ${PCB_STYLE[code] ?? "font-bold"}`}>
                                {code}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* English domain */}
        {englishDomain && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {standardDomains.length + 1}. {englishDomain.competencyArea.name}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Teacher: {englishDomain.teacher.name}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 w-8">#</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 w-28">Skill</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {englishDomain.competencyArea.skills.map((skill) => {
                    const entry = entryMap[skill.id];
                    const code = entry?.mappedCode ?? null;
                    const levels = ENGLISH_LEVELS[skill.name] ?? [];
                    const levelText = code ? levels.find((l) => l.code === code)?.text : null;
                    return (
                      <tr key={skill.id} className="hover:bg-gray-50/70">
                        <td className="px-4 py-2 text-gray-400 text-xs">{skill.order}</td>
                        <td className="px-3 py-2 text-gray-700 font-medium">{skill.name}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {code && levelText ? (
                            <span><span className="font-bold text-indigo-700">{code}</span> — {levelText}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {allDomains.length === 0 && (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-400">
            No domain assignments found for this class and period.
          </div>
        )}
      </div>
    </div>
  );
}
