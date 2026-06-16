import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { GradingForm } from "./grading-form";

export default async function StudentGradePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const session = await auth();
  const teacherId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  const { studentId } = await params;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });

  if (!student) return notFound();

  // Teachers can only grade students in their own classes
  if (role === "teacher") {
    const access = await prisma.classTeacher.findUnique({
      where: { classId_teacherId: { classId: student.classId, teacherId } },
    });
    if (!access) redirect("/teacher");
  }

  const activePeriod = await prisma.period.findFirst({
    where: { schoolId: student.schoolId, isActive: true },
  });

  if (!activePeriod) {
    return (
      <div className="p-6">
        <Link
          href="/teacher/gradebook"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={16} /> Back to Gradebook
        </Link>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-orange-700">
          No active period. Ask the admin to activate a reporting period.
        </div>
      </div>
    );
  }

  // Load domains assigned to this teacher (or all if admin) for this class + period
  const domainAssignments = await prisma.domainAssignment.findMany({
    where: {
      classId: student.classId,
      periodId: activePeriod.id,
      ...(role === "teacher" ? { teacherId } : {}),
    },
    include: {
      competencyArea: {
        include: { skills: { orderBy: { order: "asc" } } },
      },
    },
  });

  // Sort by competencyArea.order in JS (avoids Prisma join ordering complexity)
  domainAssignments.sort((a, b) => a.competencyArea.order - b.competencyArea.order);

  // Load existing progress entries for this student
  const entries = await prisma.progressEntry.findMany({
    where: { studentId, periodId: activePeriod.id },
  });

  const entryMap: Record<string, { score: number; mappedCode: string | null; narrative: string | null }> =
    Object.fromEntries(
      entries.map((e) => [e.skillId, { score: e.score, mappedCode: e.mappedCode, narrative: e.narrativeComment }])
    );

  // Load existing overall summary
  const summary = await prisma.studentPeriodSummary.findUnique({
    where: { studentId_periodId: { studentId, periodId: activePeriod.id } },
  });

  const completions = await prisma.domainCompletion.findMany({
    where: { studentId, periodId: activePeriod.id },
  });

  // Derive domain narrative from first skill entry's narrativeComment
  const domainNarratives: Record<string, string | null> = {};
  for (const d of domainAssignments) {
    const first = d.competencyArea.skills[0];
    domainNarratives[d.competencyAreaId] = first ? (entryMap[first.id]?.narrative ?? null) : null;
  }

  const domains = domainAssignments.map((d) => ({
    areaId: d.competencyAreaId,
    areaName: d.competencyArea.name,
    customScale: d.competencyArea.customScale,
    skills: d.competencyArea.skills.map((s) => ({ id: s.id, name: s.name, order: s.order })),
    narrative: domainNarratives[d.competencyAreaId] ?? null,
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/teacher/gradebook"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Gradebook
        </Link>
        <Link
          href={`/teacher/students/${studentId}/report-card`}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FileText size={16} />
          Preview Report Card
        </Link>
      </div>

      {/* Student info card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{student.fullName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {student.class.name} · Period:{" "}
              <span className="text-indigo-600 font-medium">{activePeriod.name}</span>
            </p>
            {domains.length === 0 && (
              <p className="text-sm text-orange-600 mt-2">
                No domains assigned to you for this period and class.
              </p>
            )}
          </div>
          {summary?.isPublished ? (
            <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
              Published
            </span>
          ) : summary ? (
            <span className="px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
              Draft
            </span>
          ) : null}
        </div>
      </div>

      {domains.length > 0 ? (
        <GradingForm
          studentId={studentId}
          periodId={activePeriod.id}
          domains={domains}
          entryMap={entryMap}
          overallComment={summary?.overallComment ?? ""}
          isPublished={summary?.isPublished ?? false}
          completedAreaIds={completions.map((c) => c.competencyAreaId)}
        />
      ) : (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-400">
          Contact your admin to assign competency domains to your account for this period.
        </div>
      )}
    </div>
  );
}
