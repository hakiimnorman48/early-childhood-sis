"use client";

import { useActionState, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { saveGrades, markDomainComplete, type GradeState } from "@/app/actions/grading";
import { CheckCircle } from "lucide-react";

const ENGLISH_LEVELS: Record<string, Array<{ code: string; text: string }>> = {
  Speaking: [
    { code: "a", text: "Express self using body language." },
    { code: "b", text: "Express self using one or two words." },
    { code: "c", text: "Express self using short sentences." },
  ],
  Listening: [
    { code: "a", text: "No response." },
    { code: "b", text: "Initiates to respond." },
    { code: "c", text: "Responds appropriately." },
  ],
  Reading: [
    { code: "a", text: "Enjoys book or being read to." },
    { code: "b", text: "Looks at symbol or picture." },
    { code: "c", text: "Picture read." },
    { code: "d", text: "Retell the story with her/his own words." },
  ],
  Singing: [
    { code: "a", text: "Listens to the song." },
    { code: "b", text: "Follows to sing the song." },
    { code: "c", text: "Sings the song independently." },
  ],
};

function pcbFromScore(score: number) {
  if (score <= 3) return { code: "P", color: "bg-red-100 text-red-700" };
  if (score <= 6) return { code: "C", color: "bg-yellow-100 text-yellow-700" };
  return { code: "B", color: "bg-green-100 text-green-700" };
}

interface Skill {
  id: string;
  name: string;
  order: number;
}

interface Domain {
  areaId: string;
  areaName: string;
  customScale: boolean;
  skills: Skill[];
  narrative: string | null;
}

interface EntryData {
  score: number;
  mappedCode: string | null;
  narrative: string | null;
}

interface GradingFormProps {
  studentId: string;
  periodId: string;
  domains: Domain[];
  entryMap: Record<string, EntryData>;
  overallComment: string;
  isPublished: boolean;
  completedAreaIds: string[];
}

function MarkCompleteButton({
  studentId,
  areaId,
  periodId,
  isComplete,
}: {
  studentId: string;
  areaId: string;
  periodId: string;
  isComplete: boolean;
}) {
  const [done, setDone] = useState(isComplete);
  const [isPending, startTransition] = useTransition();

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
        <CheckCircle size={14} /> Domain complete
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await markDomainComplete(studentId, areaId, periodId);
          if (result?.success) setDone(true);
        });
      }}
      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 px-3 py-1 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
    >
      {isPending ? "Saving…" : "Mark Domain Complete & Save Draft"}
    </button>
  );
}

export function GradingForm({
  studentId,
  periodId,
  domains,
  entryMap,
  overallComment,
  isPublished,
  completedAreaIds,
}: GradingFormProps) {
  const [state, formAction, isPending] = useActionState<GradeState, FormData>(
    saveGrades,
    null
  );

  const completedSet = new Set(completedAreaIds);

  const [scorePreviews, setScorePreviews] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const d of domains) {
      for (const s of d.skills) {
        const e = entryMap[s.id];
        if (e?.score !== undefined) init[s.id] = e.score;
      }
    }
    return init;
  });

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="periodId" value={periodId} />

      {/* Status banner */}
      {state?.message && (
        <div className="px-4 py-3 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
          ✓ {state.message}
        </div>
      )}
      {state?.error && (
        <div className="px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
          ⚠ {state.error}
        </div>
      )}

      {/* Domain cards */}
      {domains.map((domain) => (
        <div key={domain.areaId} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${completedSet.has(domain.areaId) ? "border-green-200" : "border-gray-200"}`}>
          <div className={`px-5 py-4 border-b flex items-center justify-between ${completedSet.has(domain.areaId) ? "bg-green-50 border-green-100" : "bg-indigo-50 border-indigo-100"}`}>
            <div>
              <h2 className="font-semibold text-gray-900">{domain.areaName}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {domain.customScale
                  ? "English scale — select highest level reached per skill"
                  : "Enter score 0–10 per indicator → auto-mapped to P / C / B"}
              </p>
            </div>
            {!domain.customScale && (
              <MarkCompleteButton
                studentId={studentId}
                areaId={domain.areaId}
                periodId={periodId}
                isComplete={completedSet.has(domain.areaId)}
              />
            )}
          </div>

          {/* Narrative textarea — standard domains only */}
          {!domain.customScale && (
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Keterangan guru <span className="text-gray-400">(domain narrative for report card)</span>
              </label>
              <textarea
                name={`narrative_${domain.areaId}`}
                defaultValue={domain.narrative ?? ""}
                rows={3}
                placeholder="Describe the child's progress in this domain…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white"
              />
            </div>
          )}

          {domain.customScale ? (
            /* ── English level selectors ── */
            <div className="p-5 space-y-5">
              {domain.skills.map((skill) => {
                const levels = ENGLISH_LEVELS[skill.name] ?? [];
                const current = entryMap[skill.id]?.mappedCode ?? "";
                return (
                  <div key={skill.id}>
                    <p className="text-sm font-medium text-gray-800 mb-2">
                      {skill.order}. {skill.name}
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                      {levels.map((level) => (
                        <label key={level.code} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`english_${skill.id}`}
                            value={level.code}
                            defaultChecked={current === level.code}
                            className="accent-indigo-600 w-4 h-4"
                          />
                          <span className="text-sm text-gray-700">
                            <span className="font-semibold text-indigo-700">{level.code}</span>
                            {" — "}
                            {level.text}
                          </span>
                        </label>
                      ))}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`english_${skill.id}`}
                          value=""
                          defaultChecked={!current}
                          className="accent-gray-400 w-4 h-4"
                        />
                        <span className="text-sm text-gray-400">Not yet assessed</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Numeric score table ── */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-10">#</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-500">Indikator</th>
                    <th className="text-center px-3 py-2.5 font-medium text-gray-500 w-32">Score (0–10)</th>
                    <th className="text-center px-3 py-2.5 font-medium text-gray-500 w-16">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {domain.skills.map((skill) => {
                    const preview = scorePreviews[skill.id];
                    const pcb = preview !== undefined ? pcbFromScore(preview) : null;
                    return (
                      <tr key={skill.id} className="hover:bg-gray-50/70">
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{skill.order}</td>
                        <td className="px-3 py-2.5 text-gray-700">{skill.name}</td>
                        <td className="px-3 py-2.5">
                          <input type="hidden" name={`area_${skill.id}`} value={domain.areaId} />
                          <input
                            type="number"
                            name={`score_${skill.id}`}
                            min="0"
                            max="10"
                            step="0.5"
                            defaultValue={entryMap[skill.id]?.score ?? ""}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v)) {
                                const rounded = Math.round(Math.max(0, Math.min(10, v)) * 2) / 2;
                                setScorePreviews((prev) => ({ ...prev, [skill.id]: rounded }));
                              }
                            }}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v)) {
                                const rounded = Math.round(Math.max(0, Math.min(10, v)) * 2) / 2;
                                e.target.value = String(rounded);
                                setScorePreviews((prev) => ({ ...prev, [skill.id]: rounded }));
                              }
                            }}
                            className="w-24 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 mx-auto block"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {pcb ? (
                            <span className={cn("px-2 py-0.5 rounded text-xs font-bold", pcb.color)}>
                              {pcb.code}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* Overall comment */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <label className="block text-sm font-semibold text-gray-900 mb-1">
          Rangkuman Perkembangan Anak{" "}
          <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Opening paragraph on the report card, written by the homeroom teacher.
        </p>
        <textarea
          name="overall_comment"
          defaultValue={overallComment}
          rows={5}
          placeholder="Tulis rangkuman perkembangan anak selama semester ini…"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 justify-end pb-8">
        <button
          type="submit"
          name="_action"
          value="draft"
          disabled={isPending}
          className="px-5 py-2.5 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving…" : "Save Draft"}
        </button>
        <button
          type="submit"
          name="_action"
          value="publish"
          disabled={isPending}
          className="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Publishing…" : isPublished ? "Re-publish" : "Publish Report Card"}
        </button>
      </div>

      {/* Scale legend */}
      <div className="flex items-center gap-6 text-xs text-gray-500 pb-4">
        <span className="font-medium text-gray-600">Scale:</span>
        {[
          { range: "0–3", code: "P", label: "Pengenalan", cls: "bg-red-100 text-red-700" },
          { range: "4–6", code: "C", label: "Cukup", cls: "bg-yellow-100 text-yellow-700" },
          { range: "7–10", code: "B", label: "Baik", cls: "bg-green-100 text-green-700" },
        ].map((l) => (
          <div key={l.code} className="flex items-center gap-1.5">
            <span className={cn("px-1.5 py-0.5 rounded text-xs font-bold", l.cls)}>{l.code}</span>
            <span>{l.label} ({l.range})</span>
          </div>
        ))}
      </div>
    </form>
  );
}
