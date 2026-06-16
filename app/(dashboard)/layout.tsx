import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const schoolId = (session.user as any).schoolId;

  const [user, school] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true } }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
  ]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar
        role={user?.role ?? "admin"}
        userName={user?.name ?? ""}
        schoolName={school?.name ?? "School"}
      />
      <main className="flex-1 overflow-y-auto print:overflow-visible">
        {children}
      </main>
    </div>
  );
}
