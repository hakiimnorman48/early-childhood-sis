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

  const role = (session.user as any).role as string;
  const userId = (session.user as any).id as string;

  if (role === "teacher") {
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { picTeacherId: true } });
    if (!student || student.picTeacherId !== userId) return { error: "Not authorized." };
  }

  // Validate both Contoh slots are fully filled
  const examples = await prisma.domainExample.findMany({
    where: { studentId, competencyAreaId, periodId },
  });
  const slot1 = examples.find((e) => e.slot === 1);
  const slot2 = examples.find((e) => e.slot === 2);
  if (
    !slot1?.date || !slot1?.session || !slot1?.text ||
    !slot2?.date || !slot2?.session || !slot2?.text
  ) {
    return { error: "Both Contoh examples (date, session, and observation) must be filled before marking a domain complete." };
  }

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

  const role = (session.user as any).role as string;
  const userId = (session.user as any).id as string;

  const studentId = formData.get("studentId") as string;
  const periodId = formData.get("periodId") as string;
  const action = formData.get("_action") as string;
  const overallComment = (formData.get("overall_comment") as string) ?? "";

  if (!studentId || !periodId) return { message: null, error: "Missing required fields" };

  // Teachers can only grade their own PIC students
  if (role === "teacher") {
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { picTeacherId: true } });
    if (!student || student.picTeacherId !== userId) {
      return { message: null, error: "You are not the PIC teacher for this student." };
    }
  }

  const isDraft = action !== "publish";

  // Collect domain narratives and skill→area mappings from form
  const narratives: Record<string, string> = {};
  const skillAreaMap: Record<string, string> = {};
  const standardAreaIds = new Set<string>();

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("narrative_")) {
      const areaId = key.slice(10);
      narratives[areaId] = value as string;
      standardAreaIds.add(areaId);
    }
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

  // English level selections (a/b/c/d)
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

  // Save Contoh examples for each standard domain
  for (const areaId of standardAreaIds) {
    for (const slot of [1, 2]) {
      const dateVal = ((formData.get(`contoh_${areaId}_${slot}_date`) as string) ?? "").trim();
      const sessionVal = ((formData.get(`contoh_${areaId}_${slot}_session`) as string) ?? "").trim();
      const textVal = ((formData.get(`contoh_${areaId}_${slot}_text`) as string) ?? "").trim();
      ops.push(
        prisma.domainExample.upsert({
          where: { studentId_competencyAreaId_periodId_slot: { studentId, competencyAreaId: areaId, periodId, slot } },
          update: { date: dateVal || null, session: sessionVal || null, text: textVal || null },
          create: { studentId, competencyAreaId: areaId, periodId, slot, date: dateVal || null, session: sessionVal || null, text: textVal || null },
        })
      );
    }
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
