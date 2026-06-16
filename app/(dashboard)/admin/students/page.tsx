import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { EditStudentButton } from "./students-client";

export default async function StudentsPage() {
  const session = await auth();
  const schoolId = (session?.user as any)?.schoolId;

  const [students, classes] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId },
      include: {
        class: true,
        parentStudents: {
          include: {
            parent: { select: { id: true, name: true, email: true, phone: true, address: true } },
          },
        },
      },
      orderBy: [{ class: { name: "asc" } }, { fullName: "asc" }],
    }),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500">{students.length} students enrolled</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Class</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Parent</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {students.map((s) => {
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
                        {s.nickname && <p className="text-xs text-gray-400">"{s.nickname}"</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                      {s.class.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(s.dateOfBirth)}</td>
                  <td className="px-4 py-3">
                    {parent ? (
                      <div>
                        <p className="text-gray-800">{parent.name}</p>
                        <p className="text-xs text-gray-400">{parent.email}</p>
                        {parent.phone && <p className="text-xs text-gray-400">{parent.phone}</p>}
                        {parent.address && (
                          <p className="text-xs text-gray-400 max-w-[180px] truncate" title={parent.address}>
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
        {students.length === 0 && (
          <div className="p-10 text-center text-gray-400">No students enrolled yet.</div>
        )}
      </div>
    </div>
  );
}
