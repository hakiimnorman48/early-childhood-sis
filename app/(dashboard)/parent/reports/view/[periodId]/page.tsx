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

export default async function ParentReportCardPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  const session = await auth();
  const parentId = (session?.user as any)?.id;
  const { periodId } = await params;

  // Get this parent's linked student(s)
  const parentLink = await prisma.parentStudent.findFirst({
    where: { parentId },
    include: {
      student: {
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
      },
    },
  });

  if (!parentLink) redirect("/parent/reports");

  const student = parentLink.student;

  const period = await prisma.period.findUnique({ where: { id: periodId } });
  if (!period || period.schoolId !== student.schoolId) return notFound();

  // Verify the summary is published before allowing parent access
  const summary = await prisma.studentPeriodSummary.findUnique({
    where: { studentId_periodId: { studentId: student.id, periodId } },
  });

  if (!summary?.isPublished) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <Link href="/parent/reports" className="inline-flex items-center gap-2 text-sm text-gray-500 mb-6">
          <ArrowLeft size={16} /> Back to Reports
        </Link>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-orange-700 text-sm">
          This report card has not been published yet. Your child's teacher will notify you when it is ready.
        </div>
      </div>
    );
  }

  const allDomains = await prisma.domainAssignment.findMany({
    where: { classId: student.classId, periodId },
    include: {
      competencyArea: {
        include: { skills: { orderBy: { order: "asc" } } },
      },
    },
  });
  allDomains.sort((a, b) => a.competencyArea.order - b.competencyArea.order);

  const entries = await prisma.progressEntry.findMany({
    where: { studentId: student.id, periodId },
  });

  const entryMap: Record<string, { score: number; mappedCode: string | null; narrative: string | null }> =
    Object.fromEntries(
      entries.map((e) => [e.skillId, { score: e.score, mappedCode: e.mappedCode, narrative: e.narrativeComment }])
    );

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: { studentId: student.id, periodId },
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
      {/* On-screen controls */}
      <div className="print:hidden px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-10">
        <Link
          href="/parent/reports"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} /> Back to Reports
        </Link>
        <PrintButton />
      </div>

      <div className="p-6 print:p-0">
        <div
          id="report-card"
          className="bg-white mx-auto max-w-3xl print:max-w-none print:shadow-none shadow-lg rounded-xl border border-gray-200 print:border-0"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {/* School Header */}
          <div className="border-b-2 border-gray-800 px-10 py-6 text-center">
            <h1 className="text-2xl font-bold tracking-wide uppercase">{student.school.name}</h1>
            <p className="text-sm text-gray-600 mt-1">Laporan Perkembangan Anak</p>
          </div>

          <div className="px-10 py-6 space-y-6">
            {/* Student Info */}
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
                <span>: {period.name}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-24">Tanggal</span>
                <span>: {today}</span>
              </div>
            </div>

            {/* Overall Summary */}
            {summary.overallComment && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2 border-b border-gray-200 pb-1">
                  Rangkuman Perkembangan Anak
                </h2>
                <p className="text-sm text-gray-800 leading-relaxed italic">
                  {summary.overallComment}
                </p>
              </div>
            )}

            {/* Legend */}
            <div className="bg-gray-50 border border-gray-200 rounded px-4 py-2.5 text-xs text-gray-600">
              <span className="font-semibold">Keterangan:</span>
              {"  "}
              <span className="text-red-600 font-bold">P</span> : Pengenalan{"  "}·{"  "}
              <span className="text-yellow-700 font-bold">C</span> : Cukup{"  "}·{"  "}
              <span className="text-green-700 font-bold">B</span> : Baik
            </div>

            {/* Attendance */}
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

            {/* Standard Domains */}
            {standardDomains.map((d, idx) => {
              const area = d.competencyArea;
              const firstSkillId = area.skills[0]?.id;
              const domainNarrative = firstSkillId ? (entryMap[firstSkillId]?.narrative ?? null) : null;

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
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs w-8">No</th>
                        <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold text-xs">Indikator</th>
                        <th className="border border-gray-300 px-3 py-1.5 text-center font-semibold text-xs w-24">
                          {period.name}
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

            {/* English Section */}
            {englishDomain && (
              <div className="break-inside-avoid-page">
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2 border-b border-gray-200 pb-1">
                  {standardDomains.length + 1}. English
                </h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs w-8">No</th>
                      <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold text-xs w-28">Skill</th>
                      <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold text-xs">{period.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {englishDomain.competencyArea.skills.map((skill) => {
                      const entry = entryMap[skill.id];
                      const code = entry?.mappedCode ?? null;
                      const levels = ENGLISH_LEVELS[skill.name] ?? [];
                      const levelText = code ? levels.find((l) => l.code === code)?.text : null;
                      return (
                        <tr key={skill.id} className="even:bg-gray-50">
                          <td className="border border-gray-200 px-2 py-2 text-center text-xs text-gray-500">
                            {skill.order}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700">
                            {skill.name}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-xs text-gray-800">
                            {code && levelText ? (
                              <span>
                                <span className="font-bold text-indigo-700">{code}</span>
                                {" — "}
                                {levelText}
                              </span>
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
            )}

            {/* Signatures */}
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
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 1.5cm; size: A4; }
          #report-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </>
  );
}
