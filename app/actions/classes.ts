"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const schoolId = (session?.user as any)?.schoolId;
  if (role !== "admin") throw new Error("Unauthorized");
  return schoolId as string;
}

export async function createClass(formData: FormData) {
  const schoolId = await requireAdmin();

  const name = (formData.get("name") as string).trim();
  const grade = (formData.get("grade") as string).trim();

  if (!name || !grade) return { error: "Class name and grade are required." };

  const existing = await prisma.class.findFirst({ where: { name, schoolId } });
  if (existing) return { error: "A class with that name already exists." };

  await prisma.class.create({ data: { name, grade, schoolId } });

  revalidatePath("/admin/classes");
  return { success: true };
}

export async function updateClass(formData: FormData) {
  const schoolId = await requireAdmin();

  const classId = formData.get("classId") as string;
  const name = (formData.get("name") as string).trim();
  const grade = (formData.get("grade") as string).trim();

  if (!classId || !name || !grade) return { error: "All fields are required." };

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.schoolId !== schoolId) return { error: "Class not found." };

  await prisma.class.update({ where: { id: classId }, data: { name, grade } });

  revalidatePath("/admin/classes");
  return { success: true };
}

export async function assignTeacher(formData: FormData) {
  const schoolId = await requireAdmin();

  const classId = formData.get("classId") as string;
  const teacherId = formData.get("teacherId") as string;
  const areaIds = formData.getAll("areaId") as string[];

  if (!classId || !teacherId) return { error: "Class and teacher are required." };

  const [teacher, cls, period] = await Promise.all([
    prisma.user.findUnique({ where: { id: teacherId } }),
    prisma.class.findUnique({ where: { id: classId } }),
    prisma.period.findFirst({ where: { schoolId, isActive: true } }),
  ]);

  if (!teacher || teacher.schoolId !== schoolId || teacher.role !== "teacher")
    return { error: "Teacher not found." };
  if (!cls || cls.schoolId !== schoolId) return { error: "Class not found." };
  if (!period) return { error: "No active grading period found." };

  await prisma.classTeacher.upsert({
    where: { classId_teacherId: { classId, teacherId } },
    update: {},
    create: { classId, teacherId },
  });

  // Clear this teacher's current domain assignments for this class+period
  await prisma.domainAssignment.deleteMany({
    where: { classId, teacherId, periodId: period.id },
  });

  if (areaIds.length > 0) {
    // Remove selected areas from whoever currently holds them (avoid unique constraint)
    await prisma.domainAssignment.deleteMany({
      where: { classId, periodId: period.id, competencyAreaId: { in: areaIds } },
    });
    for (const areaId of areaIds) {
      await prisma.domainAssignment.create({
        data: { classId, competencyAreaId: areaId, teacherId, periodId: period.id },
      });
    }
  }

  revalidatePath("/admin/classes");
  revalidatePath("/admin/accounts");
  return { success: true };
}

export async function removeTeacherFromClass(formData: FormData) {
  const schoolId = await requireAdmin();

  const classId = formData.get("classId") as string;
  const teacherId = formData.get("teacherId") as string;

  if (!classId || !teacherId) return { error: "Missing required fields." };

  const period = await prisma.period.findFirst({
    where: { schoolId, isActive: true },
  });

  if (period) {
    await prisma.domainAssignment.deleteMany({
      where: { classId, teacherId, periodId: period.id },
    });
  }

  await prisma.classTeacher.deleteMany({ where: { classId, teacherId } });

  revalidatePath("/admin/classes");
  revalidatePath("/admin/accounts");
  return { success: true };
}
