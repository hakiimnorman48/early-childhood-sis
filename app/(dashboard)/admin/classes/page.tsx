import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CreateClassButton, EditClassButton, ManageTeachersButton } from "./classes-client";

export default async function ClassesPage() {
  const session = await auth();
  const schoolId = (session?.user as any)?.schoolId;

  const [classes, teachers, areas, activePeriod] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      include: {
        students: true,
        classTeachers: {
          include: { teacher: { select: { id: true, name: true } } },
        },
        domainAssignments: {
          where: { period: { isActive: true } },
          include: { competencyArea: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { schoolId, role: "teacher", isActive: true },
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
      select: { id: true, name: true },
    }),
  ]);

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
          const assignments = cls.classTeachers.map((ct) => {
            const domains = cls.domainAssignments.filter(
              (da) => da.teacherId === ct.teacher.id
            );
            return {
              teacherId: ct.teacher.id,
              teacherName: ct.teacher.name,
              areaIds: domains.map((d) => d.competencyArea.id),
              areaNames: domains.map((d) => d.competencyArea.name),
            };
          });

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

              <div className="space-y-2 text-sm mb-4 min-h-[2rem]">
                {assignments.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No teachers assigned</p>
                ) : (
                  assignments.map((a) => (
                    <div key={a.teacherId} className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-400 w-16 shrink-0 pt-0.5">Teacher</span>
                      <div>
                        <span className="text-gray-800 font-medium text-sm">{a.teacherName}</span>
                        {a.areaNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {a.areaNames.map((name) => (
                              <span
                                key={name}
                                className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded border border-indigo-100"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs ml-2">— no domains</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <ManageTeachersButton
                classId={cls.id}
                className={cls.name}
                activePeriodId={activePeriod?.id ?? null}
                activePeriodName={activePeriod?.name ?? null}
                assignments={assignments}
                allTeachers={teachers}
                allAreas={areas}
              />
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
