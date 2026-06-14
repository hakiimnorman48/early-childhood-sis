import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function AnnouncementsPage() {
  const session = await auth();
  const schoolId = (session?.user as any)?.schoolId;

  const announcements = await prisma.announcement.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Announcements</h1>
        <p className="text-sm text-gray-500">School updates and notices</p>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-400">
          No announcements yet.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900">{a.title}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(a.createdAt)}</p>
                </div>
                <span className="text-2xl shrink-0">📢</span>
              </div>
              <p className="text-sm text-gray-700 mt-3 leading-relaxed">{a.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
