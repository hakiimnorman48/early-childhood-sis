import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { EditStudentButton, AssignPicButton } from "./students-client";

export default async function StudentsPage() {
  const session = await auth();
  const schoolId = (session?.user as any)?.schoolId;

  const [students, classes, teachers] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId },
      include: {
        class: true,
        picTeacher: { select: { id: true, name: true } },
        parentStudents: {
          include: {
            parent: { select: { id: true, name: true, email: true, phone: true, address: true } },
          },
        },
      },
      orderBy: [{ class: { name: "asc" } }, { fullName: "asc" }],
    }),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { schoolId, role: "teacher", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Group students by class
  const grouped = classes.map((cls) => ({
    cls,
    students: students.filter((s) => s.classId === cls.id),
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500">{students.length} students enrolled</p>
        </div>
      </div>

      <div className="space-y-8">
        {grouped.map(({ cls, students: classStudents }) => (
          <div key={cls.id}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{cls.name}</h2>
              <span className="text-xs text-gray-400">{classStudents.length} students</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">PIC Teacher</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Parent</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {classStudents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-xs">
                        No students in this class.
                      </td>
                    </tr>
                  )}
                  {classStudents.map((s) => {
                    const parentLink = s.parentStudents[0];
                    const parent = parentLink?.parent ?? null;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                              {s.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{s.fullName}</p>
                              {s.nickname && <p className="text-xs text-gray-500">"{s.nickname}"</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(s.dateOfBirth)}</td>
                        <td className="px-4 py-3">
                          <AssignPicButton
                            studentId={s.id}
                            currentPicId={s.picTeacherId}
                            teachers={teachers}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {parent ? (
                            <div>
                              <p className="text-gray-800">{parent.name}</p>
                              <p className="text-xs text-gray-500">{parent.email}</p>
                              {parent.phone && <p className="text-xs text-gray-500">{parent.phone}</p>}
                              {parent.address && (
                                <p className="text-xs text-gray-500 max-w-[180px] truncate" title={parent.address}>
                                  {parent.address}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">No parent linked</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 justify-end">
                            <Link
                              href={`/admin/students/${s.id}`}
                              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                            >
                              View Grading
                            </Link>
                            <EditStudentButton
                              student={{
                                id: s.id,
                                fullName: s.fullName,
                                nickname: s.nickname,
                                dateOfBirth: s.dateOfBirth,
                                classId: s.classId,
                                parent: parent
                                  ? {
                                      id: parent.id,
                                      name: parent.name,
                                      email: parent.email,
                                      phone: parent.phone,
                                      address: parent.address,
                                    }
                                  : null,
                              }}
                              classes={classes.map((c) => ({ id: c.id, name: c.name }))}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {students.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
            No students enrolled yet.
          </div>
        )}
      </div>
    </div>
  );
}
