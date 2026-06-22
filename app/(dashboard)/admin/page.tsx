import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Users, GraduationCap, BookOpen, CalendarCheck } from "lucide-react";

export default async function AdminDashboard() {
  const session = await auth();
  const schoolId = (session?.user as any)?.schoolId;

  const [studentCount, classCount, teacherCount, activePeriod, recentStudents] =
    await Promise.all([
      prisma.student.count({ where: { schoolId } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.user.count({ where: { schoolId, role: "teacher" } }),
      prisma.period.findFirst({ where: { schoolId, isActive: true } }),
      prisma.student.findMany({
        where: { schoolId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { class: true },
      }),
    ]);

  const stats = [
    { label: "Total Students", value: studentCount, icon: <GraduationCap className="text-accent" size={22} />, color: "bg-accent/10" },
    { label: "Classes", value: classCount, icon: <BookOpen className="text-purple-500" size={22} />, color: "bg-purple-50" },
    { label: "Teachers", value: teacherCount, icon: <Users className="text-teal-500" size={22} />, color: "bg-teal-50" },
    {
      label: "Active Period",
      value: activePeriod?.name ?? "None",
      icon: <CalendarCheck className="text-orange-500" size={22} />,
      color: "bg-orange-50",
      small: true,
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">School overview and management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
              {s.icon}
            </div>
            <p className={`font-bold text-ink ${s.small ? "text-base" : "text-2xl"}`}>
              {s.value}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent enrollments */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Recent Students</h2>
          <a href="/admin/students" className="text-xs text-accent hover:underline">View all →</a>
        </div>
        <div className="divide-y divide-gray-50">
          {recentStudents.length === 0 ? (
            <p className="text-sm text-gray-400 p-5">No students enrolled yet.</p>
          ) : (
            recentStudents.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                  {s.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{s.fullName}</p>
                  <p className="text-xs text-gray-500">{s.class.name} · {s.class.grade}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(s.createdAt).toLocaleDateString("en-ID", { day: "2-digit", month: "short" })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/admin/classes", label: "Manage Classes", icon: "🏫" },
          { href: "/admin/students", label: "Enroll Students", icon: "👦" },
          { href: "/admin/accounts", label: "User Accounts", icon: "👤" },
          { href: "/admin/periods", label: "Reporting Periods", icon: "📅" },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="flex flex-col items-center gap-2 bg-white border border-gray-100 rounded-2xl p-4 text-center hover:border-accent/30 hover:shadow-sm transition-all"
          >
            <span className="text-2xl">{link.icon}</span>
            <span className="text-xs font-medium text-gray-700">{link.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
