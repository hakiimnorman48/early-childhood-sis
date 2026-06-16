import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CreateClassButton, EditClassButton } from "./classes-client";

export default async function ClassesPage() {
  const session = await auth();
  const schoolId = (session?.user as any)?.schoolId;

  const classes = await prisma.class.findMany({
    where: { schoolId },
    include: {
      students: true,
      classTeachers: {
        include: { teacher: { select: { name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-500">{classes.length} class groups</p>
        </div>
        <CreateClassButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {classes.map((cls) => {
          const homeroom = cls.classTeachers.find((ct) => ct.isHomeroom);
          const others = cls.classTeachers.filter((ct) => !ct.isHomeroom);
          return (
            <div key={cls.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-base">{cls.name}</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    {cls.grade}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600">{cls.students.length}</p>
                    <p className="text-xs text-gray-400">students</p>
                  </div>
                  <EditClassButton cls={{ id: cls.id, name: cls.name, grade: cls.grade }} />
                </div>
              </div>

              <div className="space-y-1 text-sm">
                {homeroom && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-xs font-medium text-gray-400 w-20">Homeroom</span>
                    <span>{homeroom.teacher.name}</span>
                  </div>
                )}
                {others.map((ct) => (
                  <div key={ct.id} className="flex items-center gap-2 text-gray-600">
                    <span className="text-xs font-medium text-gray-400 w-20">Teacher</span>
                    <span>{ct.teacher.name}</span>
                  </div>
                ))}
                {cls.classTeachers.length === 0 && (
                  <p className="text-xs text-gray-400">No teachers assigned</p>
                )}
              </div>
            </div>
          );
        })}

        {classes.length === 0 && (
          <div className="col-span-2 bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">
            No classes created yet.
          </div>
        )}
      </div>
    </div>
  );
}
