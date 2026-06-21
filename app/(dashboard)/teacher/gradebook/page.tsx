import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Pencil, Lock } from "lucide-react";

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

  // All classes in this school
  const classes = await prisma.class.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
  });

  // All students with their PIC teacher, grouped by class
  const allStudents = await prisma.student.findMany({
    where: { schoolId },
    include: {
      class: true,
      picTeacher: { select: { id: true, name: true } },
    },
    orderBy: [{ class: { name: "asc" } }, { fullName: "asc" }],
  });

  const allStudentIds = allStudents.map((s) => s.id);

  const summaries = await prisma.studentPeriodSummary.findMany({
    where: { studentId: { in: allStudentIds }, periodId: activePeriod.id },
  });
  const summaryMap = Object.fromEntries(summaries.map((s) => [s.studentId, s]));

  // Group students by class
  const grouped = classes.map((cls) => ({
    cls,
    students: allStudents.filter((s) => s.classId === cls.id),
  }));

  const myPicCount = allStudents.filter((s) => s.picTeacherId === teacherId).length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Gradebook</h1>
        <p className="text-sm text-gray-500">
          Period: <span className="font-medium text-indigo-600">{activePeriod.name}</span>
          {" · "}
          <span className="text-indigo-600 font-medium">{myPicCount}</span> student{myPicCount !== 1 ? "s" : ""} assigned to you as PIC
        </p>
      </div>

      <div className="space-y-8">
        {grouped.map(({ cls, students }) => (
          <div key={cls.id}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{cls.name}</h2>
              <span className="text-xs text-gray-400">{students.length} students</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">PIC Teacher</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Report Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-xs">
                        No students in this class.
                      </td>
                    </tr>
                  )}
                  {students.map((student) => {
                    const isPic = student.picTeacherId === teacherId;
                    const summary = summaryMap[student.id];

                    return (
                      <tr key={student.id} className={`transition-colors ${isPic ? "hover:bg-gray-50" : "bg-gray-50/40"}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isPic ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"}`}>
                              {student.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className={`font-medium ${isPic ? "text-gray-900" : "text-gray-500"}`}>{student.fullName}</p>
                              {student.nickname && <p className="text-xs text-gray-400">"{student.nickname}"</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {student.picTeacher ? (
                            <span className={`text-xs font-medium ${isPic ? "text-indigo-600" : "text-gray-500"}`}>
                              {isPic ? "You" : student.picTeacher.name}
                            </span>
                          ) : (
                            <span className="text-xs text-orange-500">Not assigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isPic ? (
                            summary?.isPublished ? (
                              <span className="text-xs font-medium text-green-600">Published</span>
                            ) : summary ? (
                              <span className="text-xs text-yellow-600">Draft</span>
                            ) : (
                              <span className="text-xs text-gray-400">Not started</span>
                            )
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isPic ? (
                            <Link
                              href={`/teacher/students/${student.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                            >
                              <Pencil size={11} />
                              Grade
                            </Link>
                          ) : (
                            <Link
                              href={`/teacher/students/${student.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <Lock size={11} />
                              View
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {allStudents.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
            No students enrolled yet.
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-indigo-100" />
          <span>Your PIC students (can grade)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-100" />
          <span>Other students (view only)</span>
        </div>
      </div>
    </div>
  );
}
