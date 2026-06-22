import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { GradingForm } from "@/app/(dashboard)/teacher/students/[studentId]/grading-form";

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
      class: true,
      picTeacher: { select: { id: true, name: true } },
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
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-orange-700 text-sm">
          No active grading period. Go to Grading Periods and activate one first.
        </div>
      </div>
    );
  }

  // Load ALL domain assignments for this class + period (admin sees everything)
  const domainAssignments = await prisma.domainAssignment.findMany({
    where: { classId: student.classId, periodId: activePeriod.id },
    include: {
      competencyArea: { include: { skills: { orderBy: { order: "asc" } } } },
      teacher: { select: { name: true } },
    },
  });

  domainAssignments.sort((a, b) => a.competencyArea.order - b.competencyArea.order);

  const entries = await prisma.progressEntry.findMany({
    where: { studentId, periodId: activePeriod.id },
  });

  const entryMap: Record<string, { score: number; mappedCode: string | null; narrative: string | null }> =
    Object.fromEntries(
      entries.map((e) => [e.skillId, { score: e.score, mappedCode: e.mappedCode, narrative: e.narrativeComment }])
    );

  const summary = await prisma.studentPeriodSummary.findUnique({
    where: { studentId_periodId: { studentId, periodId: activePeriod.id } },
  });

  const [completions, domainExamples] = await Promise.all([
    prisma.domainCompletion.findMany({ where: { studentId, periodId: activePeriod.id } }),
    prisma.domainExample.findMany({ where: { studentId, periodId: activePeriod.id } }),
  ]);

  const contohMap: Record<string, Array<{ slot: number; date: string | null; session: string | null; text: string | null }>> = {};
  for (const ex of domainExamples) {
    if (!contohMap[ex.competencyAreaId]) contohMap[ex.competencyAreaId] = [];
    contohMap[ex.competencyAreaId].push({ slot: ex.slot, date: ex.date, session: ex.session, text: ex.text });
  }

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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin/students" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Back to Students
        </Link>
        <Link
          href={`/teacher/students/${studentId}/report-card`}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-accent text-accent rounded-xl hover:bg-accent/10 transition-colors"
        >
          <FileText size={16} />
          Preview &amp; Export Report Card
        </Link>
      </div>

      {/* Student card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink">{student.fullName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {student.class.name} · Period:{" "}
              <span className="text-accent font-medium">{activePeriod.name}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PIC Teacher:{" "}
              {student.picTeacher ? (
                <span className="text-gray-600 font-medium">{student.picTeacher.name}</span>
              ) : (
                <span className="text-orange-500">Not assigned</span>
              )}
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
          contohMap={contohMap}
        />
      ) : (
        <div className="bg-surface border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-400">
          No domain assignments found for this class and period.
        </div>
      )}
    </div>
  );
}
