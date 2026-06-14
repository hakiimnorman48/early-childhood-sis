import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { scoreToColor, scoreToLabel } from "@/lib/utils";

export default async function TeacherDashboard() {
  const session = await auth();
  const teacherId = (session?.user as any)?.id;
  const schoolId = (session?.user as any)?.schoolId;

  const activePeriod = await prisma.period.findFirst({
    where: { schoolId, isActive: true },
  });

  const myClasses = await prisma.classTeacher.findMany({
    where: { teacherId },
    include: {
      class: {
        include: {
          students: {
            include: {
              progressEntries: activePeriod
                ? { where: { periodId: activePeriod.id } }
                : undefined,
              studentPeriodSummaries: activePeriod
                ? { where: { periodId: activePeriod.id } }
                : undefined,
            },
          },
        },
      },
    },
  });

  const myDomains = await prisma.domainAssignment.findMany({
    where: { teacherId, periodId: activePeriod?.id },
    include: { competencyArea: true, class: true },
  });

  const totalStudents = myClasses.reduce((acc, ct) => acc + ct.class.students.length, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Teacher Dashboard</h1>
        {activePeriod ? (
          <p className="text-sm text-gray-500">Active period: <span className="font-medium text-indigo-600">{activePeriod.name}</span></p>
        ) : (
          <p className="text-sm text-orange-500">No active period. Ask admin to set one.</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-indigo-600">{myClasses.length}</p>
          <p className="text-xs text-gray-500 mt-1">My Classes</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-purple-600">{totalStudents}</p>
          <p className="text-xs text-gray-500 mt-1">My Students</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-teal-600">{myDomains.length}</p>
          <p className="text-xs text-gray-500 mt-1">Domains Assigned</p>
        </div>
      </div>

      {/* My classes */}
      {myClasses.map(({ class: cls, isHomeroom }) => {
        const students = cls.students;
        return (
          <div key={cls.id} className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                  {cls.name.charAt(0)}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{cls.name}</h2>
                  <p className="text-xs text-gray-400">{cls.grade} · {students.length} students{isHomeroom ? " · Homeroom" : ""}</p>
                </div>
              </div>
              <a href="/teacher/gradebook" className="text-xs text-indigo-600 hover:underline">Open Gradebook →</a>
            </div>
            <div className="divide-y divide-gray-50">
              {students.slice(0, 5).map((s) => {
                const entries = s.progressEntries ?? [];
                const avg = entries.length
                  ? entries.reduce((a, e) => a + e.score, 0) / entries.length
                  : null;
                const summary = s.studentPeriodSummaries?.[0];
                return (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {s.fullName.charAt(0)}
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-800">{s.fullName}</span>
                    {avg !== null ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        scoreToColor(avg) === "red" ? "bg-red-100 text-red-700" :
                        scoreToColor(avg) === "yellow" ? "bg-yellow-100 text-yellow-700" :
                        scoreToColor(avg) === "green" ? "bg-green-100 text-green-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {avg.toFixed(1)} · {scoreToLabel(avg)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No entries yet</span>
                    )}
                    {summary?.isPublished ? (
                      <span className="text-xs text-green-600 font-medium">Published</span>
                    ) : (
                      <span className="text-xs text-gray-400">Draft</span>
                    )}
                  </div>
                );
              })}
              {students.length > 5 && (
                <div className="px-5 py-2 text-xs text-gray-400">
                  + {students.length - 5} more students
                </div>
              )}
            </div>
          </div>
        );
      })}

      {myClasses.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">
          You are not assigned to any classes yet.
        </div>
      )}

      {/* My domain assignments */}
      {myDomains.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">My Domain Assignments</h2>
            <p className="text-xs text-gray-400 mt-0.5">You are responsible for grading these domains</p>
          </div>
          <div className="divide-y divide-gray-50">
            {myDomains.map((da) => (
              <div key={da.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                <span className="text-sm text-gray-800">{da.competencyArea.name}</span>
                <span className="ml-auto text-xs text-gray-400">{da.class.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
