import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/report-card/PrintButton";

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

const PCB_STYLE: Record<string, string> = {
  P: "text-red-600 font-bold",
  C: "text-yellow-700 font-bold",
  B: "text-green-700 font-bold",
};

export default async function ReportCardPage({
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

  // Teacher access check
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
        <p className="text-orange-600">No active period found.</p>
      </div>
    );
  }

  // All domains for this class (report card shows every domain, not just teacher's)
  const allDomains = await prisma.domainAssignment.findMany({
    where: { classId: student.classId, periodId: activePeriod.id },
    include: {
      competencyArea: {
        include: { skills: { orderBy: { order: "asc" } } },
      },
    },
  });
  allDomains.sort((a, b) => a.competencyArea.order - b.competencyArea.order);

  const entries = await prisma.progressEntry.findMany({
    where: { studentId, periodId: activePeriod.id },
  });

  const entryMap: Record<string, { score: number; mappedCode: string | null; narrative: string | null }> =
    Object.fromEntries(
      entries.map((e) => [e.skillId, { score: e.score, mappedCode: e.mappedCode, narrative: e.narrativeComment }])
    );

  const [summary, domainExamples] = await Promise.all([
    prisma.studentPeriodSummary.findUnique({
      where: { studentId_periodId: { studentId, periodId: activePeriod.id } },
    }),
    prisma.domainExample.findMany({ where: { studentId, periodId: activePeriod.id } }),
  ]);

  const contohMap: Record<string, Array<{ slot: number; date: string | null; session: string | null; text: string | null }>> = {};
  for (const ex of domainExamples) {
    if (!contohMap[ex.competencyAreaId]) contohMap[ex.competencyAreaId] = [];
    contohMap[ex.competencyAreaId].push({ slot: ex.slot, date: ex.date, session: ex.session, text: ex.text });
  }

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: { studentId, periodId: activePeriod.id },
  });
  const attendance = {
    sakit: attendanceRecords.filter((a) => a.status === "sick").length,
    alpa: attendanceRecords.filter((a) => a.status === "absent").length,
    izin: attendanceRecords.filter((a) => a.status === "permission").length,
  };

  const teachers = student.class.classTeachers.map((ct) => ({
    name: ct.teacher.name,
    isHomeroom: ct.isHomeroom,
  }));

  const standardDomains = allDomains.filter((d) => !d.competencyArea.customScale);
  const englishDomain = allDomains.find((d) => d.competencyArea.customScale);

  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      {/* On-screen controls — hidden when printing */}
      <div className="print:hidden px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-10">
        <Link
          href={`/teacher/students/${studentId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} /> Back to Grading
        </Link>
        <div className="flex items-center gap-3">
          {!summary?.isPublished && (
            <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full border border-yellow-200">
              DRAFT — not yet published to parents
            </span>
          )}
          <PrintButton />
        </div>
      </div>

      {/* Report card — visible on screen and when printing */}
      <div className="p-6 print:p-0">
        <div
          id="report-card"
          className="bg-white mx-auto max-w-3xl print:max-w-none print:shadow-none shadow-lg rounded-xl border border-gray-200 print:border-0"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {/* ── School Header ── */}
          <div className="border-b-2 border-gray-800 px-10 py-6 flex items-center justify-center gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpeg"
              alt="TK Cita Pelangi"
              className="object-contain flex-shrink-0 w-20 h-20"
            />
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-wide uppercase">{student.school.name}</h1>
              <p className="text-sm text-gray-600 mt-1">Laporan Perkembangan Anak</p>
              <p className="text-xs text-gray-500 mt-0.5">Jakarta, Indonesia</p>
            </div>
          </div>

          <div className="px-10 py-6 space-y-6">
            {/* ── Student Info ── */}
            <div className="grid grid-cols-2 gap-x-10 gap-y-1 text-sm">
              <div className="flex gap-2">
                <span className="text-gray-500 w-24">Nama</span>
                <span>: <span className="font-semibold">{student.fullName}</span></span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-24">Kelas</span>
                <span>: {student.class.name}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-24">Semester</span>
                <span>: {activePeriod.name}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-24">Tanggal</span>
                <span>: {today}</span>
              </div>
            </div>

            {/* ── Overall Summary ── */}
            {summary?.overallComment && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2 border-b border-gray-200 pb-1">
                  Rangkuman Perkembangan Anak
                </h2>
                <p className="text-sm text-gray-800 leading-relaxed italic">
                  {summary.overallComment}
                </p>
              </div>
            )}

            {/* ── P/C/B Legend ── */}
            <div className="bg-gray-50 border border-gray-200 rounded px-4 py-2.5 text-xs text-gray-600">
              <span className="font-semibold">Keterangan:</span>
              {"  "}
              <span className="text-red-600 font-bold">P</span> : Pengenalan{"  "}·{"  "}
              <span className="text-yellow-700 font-bold">C</span> : Cukup{"  "}·{"  "}
              <span className="text-green-700 font-bold">B</span> : Baik
            </div>

            {/* ── Attendance ── */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2 border-b border-gray-200 pb-1">
                Kehadiran
              </h2>
              <div className="flex gap-10 text-sm">
                <span>Sakit : <strong>{attendance.sakit}</strong> hari</span>
                <span>Alpa : <strong>{attendance.alpa}</strong> hari</span>
                <span>Izin : <strong>{attendance.izin}</strong> hari</span>
              </div>
            </div>

            {/* ── Standard Domains ── */}
            {standardDomains.map((d, idx) => {
              const area = d.competencyArea;
              const firstSkillId = area.skills[0]?.id;
              const domainNarrative = firstSkillId ? (entryMap[firstSkillId]?.narrative ?? null) : null;

              const domainContohs = (contohMap[area.id] ?? []).sort((a, b) => a.slot - b.slot);

              return (
                <div key={d.id} className="break-inside-avoid-page">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2 border-b border-gray-200 pb-1">
                    {idx + 1}. {area.name}
                  </h2>

                  {domainNarrative && (
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Keterangan guru: </span>
                      <span className="text-sm text-gray-800">{domainNarrative}</span>
                    </div>
                  )}

                  {domainContohs.length > 0 && (
                    <div className="mb-3 space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Contoh:</p>
                      {domainContohs.map((c) => (
                        <p key={c.slot} className="text-xs text-gray-700 pl-2">
                          <span className="font-semibold">{c.slot}.</span>{" "}
                          {c.date && (
                            <span className="text-gray-500">
                              {new Date(c.date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                              {c.session ? ` · ${c.session}` : ""}
                              {" — "}
                            </span>
                          )}
                          {c.text}
                        </p>
                      ))}
                    </div>
                  )}

                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs w-8">No</th>
                        <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold text-xs">
                          Indikator
                        </th>
                        <th className="border border-gray-300 px-3 py-1.5 text-center font-semibold text-xs w-24">
                          {activePeriod.name}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {area.skills.map((skill) => {
                        const entry = entryMap[skill.id];
                        const code = entry?.mappedCode ?? null;
                        return (
                          <tr key={skill.id} className="even:bg-gray-50">
                            <td className="border border-gray-200 px-2 py-1.5 text-center text-xs text-gray-500">
                              {skill.order}
                            </td>
                            <td className="border border-gray-200 px-3 py-1.5 text-xs text-gray-800">
                              {skill.name}
                            </td>
                            <td className="border border-gray-200 px-3 py-1.5 text-center text-xs">
                              {code ? (
                                <span className={PCB_STYLE[code] ?? "font-bold"}>{code}</span>
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
              );
            })}

            {/* ── English Section ── */}
            {englishDomain && (
              <div className="break-inside-avoid-page">
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2 border-b border-gray-200 pb-1">
                  {standardDomains.length + 1}. English
                </h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs w-8">No</th>
                      <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold text-xs w-28">
                        Skill
                      </th>
                      <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold text-xs">
                        Indicator
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-center font-semibold text-xs w-10">
                        ✓
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {englishDomain.competencyArea.skills.map((skill) => {
                      const entry = entryMap[skill.id];
                      const achievedCode = entry?.mappedCode ?? null;
                      const levels = ENGLISH_LEVELS[skill.name] ?? [];
                      return levels.map((level, levelIdx) => {
                        const isAchieved = achievedCode === level.code;
                        return (
                          <tr
                            key={`${skill.id}-${level.code}`}
                            className={levelIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            {levelIdx === 0 && (
                              <>
                                <td
                                  className="border border-gray-200 px-2 py-1.5 text-center text-xs text-gray-500 align-top"
                                  rowSpan={levels.length}
                                >
                                  {skill.order}
                                </td>
                                <td
                                  className="border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 align-top"
                                  rowSpan={levels.length}
                                >
                                  {skill.name}
                                </td>
                              </>
                            )}
                            <td className="border border-gray-200 px-3 py-1.5 text-xs text-gray-800">
                              <span className="font-semibold text-gray-500 mr-1">{level.code}.</span>
                              {level.text}
                            </td>
                            <td className="border border-gray-200 px-2 py-1.5 text-center text-xs">
                              {isAchieved ? (
                                <span className="text-green-600 font-bold text-base">✓</span>
                              ) : (
                                <span className="text-gray-200">□</span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Signatures ── */}
            <div className="pt-4 mt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-10 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-8">Raport ini dibuat oleh,</p>
                  {teachers.map((t) => (
                    <div key={t.name} className="mb-4">
                      <div className="w-40 border-b border-gray-400 mb-1" />
                      <p className="text-xs font-medium text-gray-700">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.isHomeroom ? "Wali Kelas" : "Guru"}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-8">Diketahui oleh,</p>
                  <div className="mb-4">
                    <div className="w-40 border-b border-gray-400 mb-1" />
                    <p className="text-xs font-medium text-gray-700">Kepala Sekolah</p>
                    <p className="text-xs text-gray-400">{student.school.name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { margin: 2cm; size: A4 portrait; }
          body { margin: 0; padding: 0; }
          #report-card {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: none !important;
          }
          table { page-break-inside: auto; border-collapse: collapse; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .break-inside-avoid-page { page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>
    </>
  );
}
