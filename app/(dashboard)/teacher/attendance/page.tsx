import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string }> = {
  present: { label: "P", color: "bg-green-100 text-green-700" },
  absent: { label: "A", color: "bg-red-100 text-red-700" },
  sick: { label: "S", color: "bg-orange-100 text-orange-700" },
  late: { label: "L", color: "bg-yellow-100 text-yellow-700" },
  permission: { label: "Iz", color: "bg-blue-100 text-blue-700" },
};

export default async function AttendancePage() {
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
            orderBy: { fullName: "asc" },
            include: {
              attendanceRecords: activePeriod
                ? {
                    where: { periodId: activePeriod.id },
                    orderBy: { date: "desc" },
                    take: 10,
                  }
                : undefined,
            },
          },
        },
      },
    },
  });

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500">
            {activePeriod ? `Period: ${activePeriod.name}` : "No active period"}
            {" · "}Today: {formatDate(today)}
          </p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          Take Today's Attendance
        </button>
      </div>

      {myClasses.map(({ class: cls }) => {
        const students = cls.students;

        const statusCounts = { present: 0, absent: 0, sick: 0, late: 0, permission: 0 };
        for (const s of students) {
          for (const r of s.attendanceRecords ?? []) {
            const status = r.status as keyof typeof statusCounts;
            if (status in statusCounts) statusCounts[status]++;
          }
        }

        return (
          <div key={cls.id} className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{cls.name}</h2>
                  <p className="text-xs text-gray-400">{students.length} students</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {Object.entries(statusCounts).map(([key, count]) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded font-bold ${statusConfig[key]?.color}`}>
                        {statusConfig[key]?.label}
                      </span>
                      <span className="text-gray-600">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Student</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Today</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Present</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Sick</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Absent</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Permission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s) => {
                  const records = s.attendanceRecords ?? [];
                  const todayRecord = records.find(
                    (r) => r.date.toISOString().split("T")[0] === today
                  );
                  const counts = {
                    present: records.filter((r) => r.status === "present").length,
                    sick: records.filter((r) => r.status === "sick").length,
                    absent: records.filter((r) => r.status === "absent").length,
                    permission: records.filter((r) => r.status === "permission").length,
                  };

                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {s.fullName.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-800">{s.fullName}</span>
                        </div>
                      </td>
                      <td className="text-center px-3 py-3">
                        {todayRecord ? (
                          <span className={`px-2 py-0.5 rounded font-bold text-xs ${statusConfig[todayRecord.status]?.color}`}>
                            {statusConfig[todayRecord.status]?.label}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="text-center px-3 py-3 text-green-700 font-medium">{counts.present}</td>
                      <td className="text-center px-3 py-3 text-orange-600 font-medium">{counts.sick}</td>
                      <td className="text-center px-3 py-3 text-red-600 font-medium">{counts.absent}</td>
                      <td className="text-center px-3 py-3 text-blue-600 font-medium">{counts.permission}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-gray-500 mt-2">
        <span className="font-medium text-gray-600">Status:</span>
        {Object.entries(statusConfig).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1">
            <span className={`px-1.5 py-0.5 rounded font-bold text-xs ${val.color}`}>{val.label}</span>
            <span className="capitalize">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
