import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { scoreToCode } from "@/lib/utils";
import { ProgressCircle } from "@/components/ui/progress-circle";
import Link from "next/link";
import { FileText } from "lucide-react";

const PCB_BADGE: Record<string, string> = {
  P: "bg-red-100 text-red-700 border-red-200",
  C: "bg-yellow-100 text-yellow-700 border-yellow-200",
  B: "bg-green-100 text-green-700 border-green-200",
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

export default async function ParentDashboard() {
  const session = await auth();
  const parentId = (session?.user as any)?.id;
  const schoolId = (session?.user as any)?.schoolId;

  const parentStudents = await prisma.parentStudent.findMany({
    where: { parentId },
    include: {
      student: {
        include: { class: true, school: true },
      },
    },
  });

  if (parentStudents.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-ink mb-4">My Child</h1>
        <div className="bg-surface border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-400">
          No children linked to your account. Please contact the school.
        </div>
      </div>
    );
  }

  const activePeriod = await prisma.period.findFirst({
    where: { schoolId, isActive: true },
  });

  const student = parentStudents[0].student;

  const [progressEntries, summary, allDomains, attendance] = await Promise.all([
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
    activePeriod
      ? prisma.domainAssignment.findMany({
          where: { classId: student.classId, periodId: activePeriod.id },
          include: {
            competencyArea: { include: { skills: { orderBy: { order: "asc" } } } },
          },
        })
      : Promise.resolve([]),
    activePeriod
      ? prisma.attendanceRecord.findMany({
          where: { studentId: student.id, periodId: activePeriod.id },
        })
      : Promise.resolve([]),
  ]);

  // Sort domains by order
  allDomains.sort((a, b) => a.competencyArea.order - b.competencyArea.order);
  const standardDomains = allDomains.filter((d) => !d.competencyArea.customScale);
  const englishDomain = allDomains.find((d) => d.competencyArea.customScale);

  // Build entry map (only published/non-draft)
  const entryMap: Record<string, { score: number; mappedCode: string | null; narrative: string | null }> =
    Object.fromEntries(
      progressEntries.map((e) => [
        e.skillId,
        { score: e.score, mappedCode: e.mappedCode, narrative: e.skill.competencyArea.customScale ? null : null },
      ])
    );

  // Domain narratives (stored on first skill)
  const domainNarrativeMap: Record<string, string | null> = {};
  for (const d of standardDomains) {
    const firstSkill = d.competencyArea.skills[0];
    if (firstSkill) {
      const entry = progressEntries.find((e) => e.skillId === firstSkill.id);
      domainNarrativeMap[d.competencyAreaId] = entry?.narrativeComment ?? null;
    }
  }

  // Area averages for circles (standard domains only)
  const areaAverages: Record<string, { name: string; avg: number; count: number }> = {};
  for (const entry of progressEntries) {
    if (entry.skill.competencyArea.customScale) continue;
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

  const sickDays = attendance.filter((r) => r.status === "sick").length;
  const absentDays = attendance.filter((r) => r.status === "absent").length;
  const permissionDays = attendance.filter((r) => r.status === "permission").length;
  const presentDays = attendance.filter((r) => r.status === "present").length;

  const ageYears = Math.floor(
    (Date.now() - new Date(student.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365)
  );

  const hasPublishedReport = !!summary;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Child header */}
      <div className="bg-gradient-to-r from-accent to-blue-600 rounded-2xl p-5 text-white mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold">
            {student.fullName.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{student.fullName}</h1>
            {student.nickname && <p className="text-white/70 text-sm">&ldquo;{student.nickname}&rdquo;</p>}
            <p className="text-sm text-white/80 mt-1">
              {student.class.name} · {student.class.grade} · {ageYears} years old
            </p>
          </div>
          {overallAvg !== null && (
            <div className="ml-auto text-center">
              <p className="text-3xl font-bold">{overallAvg.toFixed(1)}</p>
              <p className="text-xs text-white/70 mt-0.5">{scoreToCode(overallAvg)} — Overall</p>
            </div>
          )}
        </div>
        {activePeriod && (
          <p className="mt-3 text-xs text-white/70">Period: {activePeriod.name}</p>
        )}
      </div>

      {/* Report card download */}
      {hasPublishedReport && activePeriod && (
        <div className="bg-white rounded-2xl border border-accent/20 shadow-sm p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Report Card Available</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Published for {activePeriod.name}
            </p>
          </div>
          <Link
            href={`/parent/reports/view/${activePeriod.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
          >
            <FileText size={15} />
            View &amp; Print Report Card
          </Link>
        </div>
      )}

      {/* Teacher's overall summary */}
      {summary?.overallComment && (
        <div className="bg-white rounded-2xl border border-accent/10 shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-ink mb-2 text-sm">Rangkuman Perkembangan Anak</h2>
          <p className="text-gray-700 text-sm leading-relaxed italic">&ldquo;{summary.overallComment}&rdquo;</p>
        </div>
      )}

      {/* Competency overview circles */}
      {Object.keys(areaAverages).length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-ink mb-4 text-sm">Ringkasan Area Perkembangan</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-items-center">
            {Object.values(areaAverages).map((area) => {
              const code = scoreToCode(area.avg);
              return (
                <div key={area.name} className="flex flex-col items-center gap-2">
                  <ProgressCircle score={area.avg} size="md" />
                  <p className="text-xs text-center text-gray-600 font-medium max-w-[90px] leading-tight">
                    {area.name}
                  </p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PCB_BADGE[code] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {code}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        !hasPublishedReport && (
          <div className="bg-surface border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-400 mb-6">
            {activePeriod
              ? "No published progress yet for this period. Check back after your teacher publishes the report."
              : "No active period. Contact your school."}
          </div>
        )
      )}

      {/* Per-domain detail with skills */}
      {standardDomains.length > 0 && summary && (
        <div className="space-y-4 mb-6">
          <h2 className="font-semibold text-ink text-sm">Detail Per Domain</h2>
          {standardDomains.map((d, idx) => {
            const area = d.competencyArea;
            const narrative = domainNarrativeMap[d.competencyAreaId];
            const gradedSkills = area.skills.filter((s) => entryMap[s.id]?.mappedCode);
            if (gradedSkills.length === 0) return null;

            return (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-surface border-b border-gray-100">
                  <h3 className="font-semibold text-ink text-sm">
                    {idx + 1}. {area.name}
                  </h3>
                  {narrative && (
                    <p className="text-xs text-gray-600 mt-1 italic">&ldquo;{narrative}&rdquo;</p>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {area.skills.map((skill) => {
                    const entry = entryMap[skill.id];
                    const code = entry?.mappedCode ?? null;
                    return (
                      <div key={skill.id} className="px-5 py-2.5 flex items-center justify-between">
                        <p className="text-sm text-gray-700">
                          <span className="text-xs text-gray-400 mr-2">{skill.order}.</span>
                          {skill.name}
                        </p>
                        {code ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${PCB_BADGE[code] ?? "bg-gray-100"}`}>
                            {code}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* English domain */}
          {englishDomain && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-surface border-b border-gray-100">
                <h3 className="font-semibold text-ink text-sm">
                  {standardDomains.length + 1}. {englishDomain.competencyArea.name}
                </h3>
              </div>
              <div className="divide-y divide-gray-50">
                {englishDomain.competencyArea.skills.map((skill) => {
                  const entry = entryMap[skill.id];
                  const code = entry?.mappedCode ?? null;
                  const levels = ENGLISH_LEVELS[skill.name] ?? [];
                  const levelText = code ? levels.find((l) => l.code === code)?.text : null;
                  return (
                    <div key={skill.id} className="px-5 py-2.5 flex items-center justify-between gap-4">
                      <p className="text-sm text-gray-700 font-medium">{skill.name}</p>
                      {code && levelText ? (
                        <p className="text-xs text-gray-600 text-right">
                          <span className="font-bold text-accent">{code}</span>
                          {" — "}
                          {levelText}
                        </p>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scale legend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Keterangan Nilai</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { range: "0–3", label: "P — Pengenalan", desc: "Sedang diperkenalkan", cls: "border-red-200 bg-red-50 text-red-700" },
            { range: "4–6", label: "C — Cukup", desc: "Mulai berkembang", cls: "border-yellow-200 bg-yellow-50 text-yellow-700" },
            { range: "7–10", label: "B — Baik", desc: "Berkembang dengan baik", cls: "border-green-200 bg-green-50 text-green-700" },
          ].map((item) => (
            <div key={item.range} className={`rounded-xl border px-3 py-2 ${item.cls}`}>
              <p className="font-bold text-sm">{item.range}</p>
              <p className="text-xs font-medium">{item.label}</p>
              <p className="text-xs opacity-70">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-ink mb-4 text-sm">Kehadiran Periode Ini</h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { label: "Hadir", value: presentDays, cls: "bg-green-50 text-green-700" },
            { label: "Sakit", value: sickDays, cls: "bg-orange-50 text-orange-600" },
            { label: "Alpa", value: absentDays, cls: "bg-red-50 text-red-600" },
            { label: "Izin", value: permissionDays, cls: "bg-blue-50 text-blue-600" },
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
