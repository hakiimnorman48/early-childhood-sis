"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function markDomainComplete(
  studentId: string,
  competencyAreaId: string,
  periodId: string
) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  await prisma.domainCompletion.upsert({
    where: { studentId_competencyAreaId_periodId: { studentId, competencyAreaId, periodId } },
    update: { completedAt: new Date() },
    create: { studentId, competencyAreaId, periodId },
  });

  revalidatePath(`/teacher/students/${studentId}`);
  return { success: true };
}

function scoreToCode(score: number): string {
  if (score <= 3) return "P";
  if (score <= 6) return "C";
  return "B";
}

export type GradeState = { message: string | null; error: string | null } | null;

export async function saveGrades(
  _prev: GradeState,
  formData: FormData
): Promise<GradeState> {
  const session = await auth();
  if (!session?.user) return { message: null, error: "Unauthorized" };

  const studentId = formData.get("studentId") as string;
  const periodId = formData.get("periodId") as string;
  const action = formData.get("_action") as string;
  const overallComment = (formData.get("overall_comment") as string) ?? "";

  if (!studentId || !periodId) return { message: null, error: "Missing required fields" };

  const isDraft = action !== "publish";

  // Collect domain narratives and skill→area mappings from form
  const narratives: Record<string, string> = {};
  const skillAreaMap: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("narrative_")) narratives[key.slice(10)] = value as string;
    if (key.startsWith("area_")) skillAreaMap[key.slice(5)] = value as string;
  }

  const ops: Promise<unknown>[] = [];

  // Standard numeric scores (0–10)
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("score_")) continue;
    const skillId = key.slice(6);
    const raw = parseFloat(value as string);
    if (isNaN(raw)) continue;
    const score = Math.round(Math.max(0, Math.min(10, raw)) * 2) / 2;
    const areaId = skillAreaMap[skillId];
    const narrative = areaId ? (narratives[areaId] ?? null) : null;
    ops.push(
      prisma.progressEntry.upsert({
        where: { studentId_skillId_periodId: { studentId, skillId, periodId } },
        update: { score, mappedCode: scoreToCode(score), isDraft, narrativeComment: narrative },
        create: { studentId, skillId, periodId, score, mappedCode: scoreToCode(score), isDraft, narrativeComment: narrative },
      })
    );
  }

  // English level selections (a/b/c/d → stored as index 1–4 + code letter)
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("english_")) continue;
    const skillId = key.slice(8);
    const code = (value as string).trim();
    if (!code) continue;
    const levelIndex = ["a", "b", "c", "d"].indexOf(code) + 1;
    if (levelIndex < 1) continue;
    ops.push(
      prisma.progressEntry.upsert({
        where: { studentId_skillId_periodId: { studentId, skillId, periodId } },
        update: { score: levelIndex, mappedCode: code, isDraft },
        create: { studentId, skillId, periodId, score: levelIndex, mappedCode: code, isDraft },
      })
    );
  }

  try {
    await Promise.all(ops);

    await prisma.studentPeriodSummary.upsert({
      where: { studentId_periodId: { studentId, periodId } },
      update: {
        overallComment,
        isPublished: !isDraft,
        publishedAt: !isDraft ? new Date() : null,
      },
      create: {
        studentId,
        periodId,
        overallComment,
        isPublished: !isDraft,
        publishedAt: !isDraft ? new Date() : null,
      },
    });
  } catch (err: unknown) {
    return { message: null, error: `Save failed: ${err instanceof Error ? err.message : "unknown error"}` };
  }

  revalidatePath(`/teacher/students/${studentId}`);
  revalidatePath("/teacher/gradebook");
  revalidatePath("/teacher");
  revalidatePath(`/parent/reports`);

  return {
    message: isDraft ? "Saved as draft." : "Published! The report card is now visible to parents.",
    error: null,
  };
}
