import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { CreateAccountButton, EditAccountButton } from "./accounts-client";

const roleBadge: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  teacher: "bg-indigo-100 text-indigo-700",
  parent: "bg-teal-100 text-teal-700",
};

export default async function AccountsPage() {
  const session = await auth();
  const schoolId = (session?.user as any)?.schoolId;

  const [users, classes, areas, activePeriod] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId },
      include: {
        classTeachers: {
          include: { class: { select: { id: true, name: true } } },
        },
        domainAssignments: {
          where: { period: { isActive: true } },
          include: {
            competencyArea: { select: { id: true, name: true } },
            class: { select: { id: true } },
          },
        },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.competencyArea.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      orderBy: { order: "asc" },
    }),
    prisma.period.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true },
    }),
  ]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Accounts</h1>
          <p className="text-sm text-gray-500">{users.length} accounts</p>
        </div>
        <CreateAccountButton />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => {
              const teacherAssignments = u.classTeachers.map((ct) => {
                const domains = u.domainAssignments.filter((da) => da.class.id === ct.class.id);
                return {
                  classId: ct.class.id,
                  className: ct.class.name,
                  areaIds: domains.map((d) => d.competencyArea.id),
                  areaNames: domains.map((d) => d.competencyArea.name),
                };
              });

              return (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 block">{u.name}</span>
                        {u.role === "teacher" && teacherAssignments.length > 0 && (
                          <span className="text-xs text-gray-400">
                            {teacherAssignments.map((a) => a.className).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleBadge[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <EditAccountButton
                      user={{ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive }}
                      teacherData={
                        u.role === "teacher"
                          ? {
                              assignments: teacherAssignments,
                              availableClasses: classes,
                              availableAreas: areas,
                              activePeriodId: activePeriod?.id ?? null,
                            }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-10 text-center text-gray-400">No accounts found.</div>
        )}
      </div>
    </div>
  );
}
