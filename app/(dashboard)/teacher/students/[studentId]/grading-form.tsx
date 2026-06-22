"use client";

import { useActionState, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { saveGrades, markDomainComplete, type GradeState } from "@/app/actions/grading";
import { CheckCircle } from "lucide-react";

const ENGLISH_LEVELS: Record<string, Array<{ code: string; text: string }>> = {
  Speaking: [
    { code: "a", text: "Body language." },
    { code: "b", text: "One or two words." },
    { code: "c", text: "Short sentence." },
  ],
  Listening: [
    { code: "a", text: "No respond." },
    { code: "b", text: "Initiates to respond." },
    { code: "c", text: "Responds appropriately." },
  ],
  Reading: [
    { code: "a", text: "Enjoys book or being read to." },
    { code: "b", text: "Looks at symbol or picture." },
    { code: "c", text: "Picture read." },
    { code: "d", text: "Retell the story with her/his words." },
  ],
  Singing: [
    { code: "a", text: "Listens to the song." },
    { code: "b", text: "Follows to sing the song." },
    { code: "c", text: "Sing the song." },
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

interface ContohEntry {
  slot: number;
  date: string | null;
  session: string | null;
  text: string | null;
}

interface GradingFormProps {
  studentId: string;
  periodId: string;
  domains: Domain[];
  entryMap: Record<string, EntryData>;
  overallComment: string;
  isPublished: boolean;
  completedAreaIds: string[];
  contohMap: Record<string, ContohEntry[]>;
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
        <CheckCircle size={14} /> Domain complete
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setErrorMsg(null);
          startTransition(async () => {
            const result = await markDomainComplete(studentId, areaId, periodId);
            if (result?.success) setDone(true);
            else if (result?.error) setErrorMsg(result.error);
          });
        }}
        className="text-xs text-accent hover:text-accent/80 font-medium border border-accent/20 px-3 py-1 rounded-xl hover:bg-accent/10 transition-colors disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Mark Domain Complete & Save Draft"}
      </button>
      {errorMsg && (
        <p className="text-xs text-red-600 max-w-xs text-right">{errorMsg}</p>
      )}
    </div>
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
  contohMap,
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
        <div className="px-4 py-3 rounded-xl text-sm font-medium bg-green-50 text-green-700 border border-green-200">
          ✓ {state.message}
        </div>
      )}
      {state?.error && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">
          ⚠ {state.error}
        </div>
      )}

      {/* Domain cards */}
      {domains.map((domain) => (
        <div key={domain.areaId} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${completedSet.has(domain.areaId) ? "border-green-200" : "border-gray-100"}`}>
          {/* Domain header */}
          <div className={`px-5 py-4 border-b flex items-center justify-between ${completedSet.has(domain.areaId) ? "bg-green-50 border-green-100" : "bg-accent/10 border-accent/10"}`}>
            <div>
              <h2 className="font-semibold text-ink">{domain.areaName}</h2>
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

          {/* Standard domains only: narrative + Contoh + score table */}
          {!domain.customScale && (
            <>
              {/* Keterangan guru */}
              <div className="px-5 py-4 border-b border-gray-100 bg-surface/60">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Keterangan guru <span className="text-gray-400">(domain narrative for report card)</span>
                </label>
                <textarea
                  name={`narrative_${domain.areaId}`}
                  defaultValue={domain.narrative ?? ""}
                  rows={3}
                  placeholder="Describe the child's progress in this domain…"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none bg-white"
                />
              </div>

              {/* Contoh — 2 mandatory observation slots */}
              <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/40 space-y-5">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Contoh <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal normal-case ml-1">
                    — kedua contoh wajib diisi sebelum domain dapat ditandai selesai
                  </span>
                </p>
                {([1, 2] as const).map((slot) => {
                  const existing = contohMap[domain.areaId]?.find((e) => e.slot === slot);
                  return (
                    <div key={slot} className="space-y-2">
                      <p className="text-xs font-semibold text-amber-700">Contoh {slot}</p>
                      <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs text-gray-500 mb-1">Tanggal</label>
                          <input
                            type="date"
                            name={`contoh_${domain.areaId}_${slot}_date`}
                            defaultValue={existing?.date ?? ""}
                            className="w-full text-sm bg-surface border border-gray-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/30"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs text-gray-500 mb-1">Waktu / Sesi</label>
                          <input
                            type="text"
                            name={`contoh_${domain.areaId}_${slot}_session`}
                            defaultValue={existing?.session ?? ""}
                            placeholder="e.g. Class Time, Snack Time"
                            className="w-full text-sm bg-surface border border-gray-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/30"
                          />
                        </div>
                      </div>
                      <textarea
                        name={`contoh_${domain.areaId}_${slot}_text`}
                        defaultValue={existing?.text ?? ""}
                        rows={2}
                        placeholder={`Tuliskan observasi untuk contoh ${slot}…`}
                        className="w-full text-sm bg-surface border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {domain.customScale ? (
            /* ── English level selectors ── */
            <div className="p-5 space-y-5">
              {domain.skills.map((skill) => {
                const levels = ENGLISH_LEVELS[skill.name] ?? [];
                const current = entryMap[skill.id]?.mappedCode ?? "";
                return (
                  <div key={skill.id}>
                    <p className="text-sm font-medium text-ink mb-2">
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
                            className="accent-[#036aff] w-4 h-4"
                          />
                          <span className="text-sm text-gray-700">
                            <span className="font-semibold text-accent">{level.code}</span>
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
                <thead className="bg-surface border-b border-gray-100">
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
                      <tr key={skill.id} className="hover:bg-surface/40">
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
                            className="w-24 text-center bg-surface border border-gray-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 mx-auto block"
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <label className="block text-sm font-semibold text-ink mb-1">
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
          className="w-full text-sm bg-surface border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 justify-end pb-8">
        <button
          type="submit"
          name="_action"
          value="draft"
          disabled={isPending}
          className="px-5 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-700 hover:bg-surface disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving…" : "Save Draft"}
        </button>
        <button
          type="submit"
          name="_action"
          value="publish"
          disabled={isPending}
          className="px-5 py-2.5 text-sm font-medium bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 transition-colors"
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
