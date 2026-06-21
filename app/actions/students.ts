"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function assignPicTeacher(formData: FormData) {
  const schoolId = await requireAdmin();

  const studentId = formData.get("studentId") as string;
  const picTeacherId = (formData.get("picTeacherId") as string) || null;

  if (!studentId) return { error: "Student ID is required." };

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== schoolId) return { error: "Student not found." };

  if (picTeacherId) {
    const teacher = await prisma.user.findUnique({ where: { id: picTeacherId } });
    if (!teacher || teacher.schoolId !== schoolId || teacher.role !== "teacher") {
      return { error: "Teacher not found." };
    }
  }

  await prisma.student.update({
    where: { id: studentId },
    data: { picTeacherId },
  });

  revalidatePath("/admin/students");
  return { success: true };
}

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const schoolId = (session?.user as any)?.schoolId;
  if (role !== "admin") throw new Error("Unauthorized");
  return schoolId as string;
}

export async function updateStudent(formData: FormData) {
  const schoolId = await requireAdmin();

  const studentId = formData.get("studentId") as string;
  const fullName = (formData.get("fullName") as string).trim();
  const nickname = (formData.get("nickname") as string | null) ?? "";
  const classId = formData.get("classId") as string;
  const dateOfBirth = formData.get("dateOfBirth") as string;

  if (!studentId || !fullName || !classId || !dateOfBirth) {
    return { error: "Full name, class, and date of birth are required." };
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== schoolId) return { error: "Student not found." };

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.schoolId !== schoolId) return { error: "Class not found." };

  await prisma.student.update({
    where: { id: studentId },
    data: {
      fullName,
      nickname: nickname.trim() || null,
      classId,
      dateOfBirth: new Date(dateOfBirth),
    },
  });

  revalidatePath("/admin/students");
  return { success: true };
}

export async function updateParentContact(formData: FormData) {
  const schoolId = await requireAdmin();

  const parentId = formData.get("parentId") as string;
  const phone = (formData.get("phone") as string | null) ?? "";
  const address = (formData.get("address") as string | null) ?? "";

  if (!parentId) return { error: "Parent ID is required." };

  const parent = await prisma.user.findUnique({ where: { id: parentId } });
  if (!parent || parent.schoolId !== schoolId || parent.role !== "parent") {
    return { error: "Parent account not found." };
  }

  await prisma.user.update({
    where: { id: parentId },
    data: { phone: phone.trim() || null, address: address.trim() || null },
  });

  revalidatePath("/admin/students");
  return { success: true };
}
