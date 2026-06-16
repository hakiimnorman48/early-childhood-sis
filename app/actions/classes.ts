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
