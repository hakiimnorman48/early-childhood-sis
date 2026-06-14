import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { scoreToColor, scoreToLabel, scoreToCode } from "@/lib/utils";
import { ProgressCircle } from "@/components/ui/progress-circle";

export default async function ParentDashboard() {
  const session = await auth();
  const parentId = (session?.user as any)?.id;
  const schoolId = (session?.user as any)?.schoolId;

  const parentStudents = await prisma.parentStudent.findMany({
    where: { parentId },
    include: {
      student: {
        include: {
          class: true,
          school: true,
        },
      },
    },
  });

  if (parentStudents.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">My Child</h1>
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-400">
          No children linked to your account. Please contact the school.
        </div>
      </div>
    );
  }

  const activePeriod = await prisma.period.findFirst({
    where: { schoolId, isActive: true },
  });

  const student = parentStudents[0].student;

  const [progressEntries, summary, areas, attendance] = await Promise.all([
    activePeriod
      ? prisma.progressEntry.findMany({
          where: { studentId: student.id, periodId: activePeriod.id, isDraft: false },
          include: { skill: { include: { competencyArea: true } } },
        })
      : Promise.resolve([]),
    activePeriod
      ? prisma.studentPeriodSummary.findFirst({
          where: { studentId: student.id, periodId: activePeriod.id, isPublished: true },
        })
      : Promise.resolve(null),
    prisma.competencyArea.findMany({
      where: { schoolId, isActive: true },
      include: { skills: true },
      orderBy: { order: "asc" },
    }),
    activePeriod
      ? prisma.attendanceRecord.findMany({
          where: { studentId: student.id, periodId: activePeriod.id },
        })
      : Promise.resolve([]),
  ]);

  const areaAverages: Record<string, { name: string; avg: number; count: number }> = {};
  for (const entry of progressEntries) {
    const areaId = entry.skill.competencyAreaId;
    const areaName = entry.skill.competencyArea.name;
    if (!areaAverages[areaId]) areaAverages[areaId] = { name: areaName, avg: 0, count: 0 };
    areaAverages[areaId].avg += entry.score;
    areaAverages[areaId].count++;
  }
  for (const key of Object.keys(areaAverages)) {
    areaAverages[key].avg = areaAverages[key].avg / areaAverages[key].count;
  }

  const overallAvg =
    Object.values(areaAverages).length > 0
      ? Object.values(areaAverages).reduce((a, b) => a + b.avg, 0) / Object.values(areaAverages).length
      : null;

  const presentDays = attendance.filter((r) => r.status === "present").length;
  const sickDays = attendance.filter((r) => r.status === "sick").length;
  const absentDays = attendance.filter((r) => r.status === "absent").length;
  const permissionDays = attendance.filter((r) => r.status === "permission").length;

  const ageYears = Math.floor(
    (Date.now() - new Date(student.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365)
  );

  const colorPalette: Record<string, string> = {
    red: "border-red-200 bg-red-50",
    yellow: "border-yellow-200 bg-yellow-50",
    green: "border-green-200 bg-green-50",
    blue: "border-blue-200 bg-blue-50",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Child header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold">
            {student.fullName.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{student.fullName}</h1>
            {student.nickname && <p className="text-indigo-200 text-sm">"{student.nickname}"</p>}
            <p className="text-sm text-indigo-100 mt-1">
              {student.class.name} · {student.class.grade} · {ageYears} years old
            </p>
          </div>
          {overallAvg !== null && (
            <div className="ml-auto text-center">
              <p className="text-3xl font-bold">{overallAvg.toFixed(1)}</p>
              <p className="text-xs text-indigo-200">{scoreToLabel(overallAvg)}</p>
              <p className="text-xs text-indigo-200">Overall</p>
            </div>
          )}
        </div>
        {activePeriod && (
          <p className="mt-3 text-xs text-indigo-200">
            Period: {activePeriod.name}
          </p>
        )}
      </div>

      {/* Teacher's summary */}
      {summary?.overallComment && (
        <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <span>📝</span> Teacher's Summary
          </h2>
          <p className="text-gray-700 text-sm leading-relaxed italic">"{summary.overallComment}"</p>
        </div>
      )}

      {/* Competency circles */}
      {Object.keys(areaAverages).length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Development Areas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-items-center">
            {Object.values(areaAverages).map((area) => (
              <div key={area.name} className="flex flex-col items-center gap-2">
                <ProgressCircle score={area.avg} size="md" />
                <p className="text-xs text-center text-gray-600 font-medium max-w-[90px] leading-tight">
                  {area.name}
                </p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colorPalette[scoreToColor(area.avg)]}`}>
                  {scoreToCode(area.avg)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400 mb-6">
          {activePeriod
            ? "No published progress yet for this period. Check back after your teacher publishes the report."
            : "No active period. Contact your school."}
        </div>
      )}

      {/* Scale legend */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Progress Scale</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { range: "0–3", label: "Not Yet (P)", desc: "Skill not yet observed", cls: "border-red-200 bg-red-50 text-red-700" },
            { range: "4–6", label: "Emerging (C)", desc: "Beginning to show", cls: "border-yellow-200 bg-yellow-50 text-yellow-700" },
            { range: "7–8", label: "Developing (B)", desc: "Showing consistently", cls: "border-green-200 bg-green-50 text-green-700" },
            { range: "9–10", label: "Achieved (B+)", desc: "Skill mastered", cls: "border-blue-200 bg-blue-50 text-blue-700" },
          ].map((item) => (
            <div key={item.range} className={`rounded-lg border px-3 py-2 ${item.cls}`}>
              <p className="font-bold text-sm">{item.range}</p>
              <p className="text-xs font-medium">{item.label}</p>
              <p className="text-xs opacity-70">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Attendance This Period</h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { label: "Present", value: presentDays, cls: "bg-green-50 text-green-700" },
            { label: "Sick", value: sickDays, cls: "bg-orange-50 text-orange-600" },
            { label: "Absent", value: absentDays, cls: "bg-red-50 text-red-600" },
            { label: "Permission", value: permissionDays, cls: "bg-blue-50 text-blue-600" },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl p-3 ${item.cls}`}>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs font-medium mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
