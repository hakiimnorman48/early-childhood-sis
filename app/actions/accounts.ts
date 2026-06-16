"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const schoolId = (session?.user as any)?.schoolId;
  if (role !== "admin") throw new Error("Unauthorized");
  return schoolId as string;
}

export async function createAccount(formData: FormData) {
  const schoolId = await requireAdmin();

  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!name || !email || !password || !role) {
    return { error: "All fields are required." };
  }
  if (!["teacher", "parent", "admin"].includes(role)) {
    return { error: "Invalid role." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { name, email, password: hashed, role, schoolId, isActive: true },
  });

  revalidatePath("/admin/accounts");
  return { success: true };
}

export async function updateAccount(formData: FormData) {
  const schoolId = await requireAdmin();

  const userId = formData.get("userId") as string;
  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string).trim().toLowerCase();
  const role = formData.get("role") as string;
  const isActive = formData.get("isActive") === "true";
  const newPassword = (formData.get("newPassword") as string | null) ?? "";

  if (!userId || !name || !email || !role) {
    return { error: "All fields are required." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.schoolId !== schoolId) return { error: "User not found." };

  const duplicate = await prisma.user.findFirst({
    where: { email, id: { not: userId } },
  });
  if (duplicate) return { error: "That email is already used by another account." };

  const updateData: Record<string, unknown> = { name, email, role, isActive };
  if (newPassword.trim().length > 0) {
    if (newPassword.length < 6) return { error: "New password must be at least 6 characters." };
    updateData.password = await bcrypt.hash(newPassword, 12);
  }

  await prisma.user.update({ where: { id: userId }, data: updateData });

  revalidatePath("/admin/accounts");
  return { success: true };
}
