import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function StudentsPage() {
  const session = await auth();
  const schoolId = (session?.user as any)?.schoolId;

  const students = await prisma.student.findMany({
    where: { schoolId },
    include: {
      class: true,
      parentStudents: { include: { parent: { select: { name: true, email: true } } } },
    },
    orderBy: [{ class: { name: "asc" } }, { fullName: "asc" }],
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500">{students.length} students enrolled</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          + Add Student
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Class</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Parent</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Enrolled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {students.map((s) => {
              const parent = s.parentStudents[0]?.parent;
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
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No parent linked</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(s.enrollmentDate)}</td>
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
