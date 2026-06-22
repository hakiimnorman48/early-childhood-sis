"use client";

import { useRef, useState, useTransition } from "react";
import { createClass, updateClass, assignTeacher, removeTeacherFromClass } from "@/app/actions/classes";
import { X } from "lucide-react";

interface ClassData {
  id: string;
  name: string;
  grade: string;
}

interface TeacherOption {
  id: string;
  name: string;
}

interface AreaOption {
  id: string;
  name: string;
}

interface Assignment {
  teacherId: string;
  teacherName: string;
  areaIds: string[];
  areaNames: string[];
}

function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? "max-w-lg" : "max-w-sm"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CreateClassButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createClass(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(null); }}
        className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
      >
        + New Class
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="New Class">
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class Name</label>
            <input
              name="name"
              required
              placeholder="e.g. TK B 1"
              className="w-full bg-surface border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grade / Level</label>
            <input
              name="grade"
              required
              placeholder="e.g. TK B"
              className="w-full bg-surface border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-surface">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 transition-colors">
              {isPending ? "Creating…" : "Create Class"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function EditClassButton({ cls }: { cls: ClassData }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateClass(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(null); }}
        className="text-xs text-accent hover:text-accent/80 font-medium"
      >
        Edit
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title={`Edit — ${cls.name}`}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input type="hidden" name="classId" value={cls.id} />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class Name</label>
            <input
              name="name"
              required
              defaultValue={cls.name}
              className="w-full bg-surface border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grade / Level</label>
            <input
              name="grade"
              required
              defaultValue={cls.grade}
              className="w-full bg-surface border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-surface">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 transition-colors">
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function ManageTeachersButton({
  classId,
  className,
  activePeriodId,
  activePeriodName,
  assignments,
  allTeachers,
  allAreas,
}: {
  classId: string;
  className: string;
  activePeriodId: string | null;
  activePeriodName: string | null;
  assignments: Assignment[];
  allTeachers: TeacherOption[];
  allAreas: AreaOption[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function openAdd() {
    setMode("form");
    setEditingTeacherId(null);
    setSelectedTeacherId("");
    setSelectedAreaIds(new Set());
    setError(null);
  }

  function openEdit(a: Assignment) {
    setMode("form");
    setEditingTeacherId(a.teacherId);
    setSelectedTeacherId(a.teacherId);
    setSelectedAreaIds(new Set(a.areaIds));
    setError(null);
  }

  function handleClose() {
    setOpen(false);
    setMode("list");
    setError(null);
    setSuccessMsg(null);
  }

  function toggleArea(areaId: string) {
    setSelectedAreaIds((prev) => {
      const next = new Set(prev);
      next.has(areaId) ? next.delete(areaId) : next.add(areaId);
      return next;
    });
  }

  function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeacherId) { setError("Select a teacher."); return; }
    if (!activePeriodId) { setError("No active grading period."); return; }

    const fd = new FormData();
    fd.set("classId", classId);
    fd.set("teacherId", selectedTeacherId);
    for (const id of selectedAreaIds) fd.append("areaId", id);

    startTransition(async () => {
      const result = await assignTeacher(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        setMode("list");
        setSuccessMsg("Assignment saved.");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    });
  }

  function handleRemove(teacherId: string) {
    const fd = new FormData();
    fd.set("classId", classId);
    fd.set("teacherId", teacherId);
    startTransition(async () => {
      const result = await removeTeacherFromClass(fd);
      if (result?.error) setError(result.error);
    });
  }

  const assignedTeacherIds = new Set(assignments.map((a) => a.teacherId));
  const unassignedTeachers = allTeachers.filter((t) => !assignedTeacherIds.has(t.id));

  return (
    <>
      <button
        onClick={() => { setOpen(true); setMode("list"); setError(null); setSuccessMsg(null); }}
        className="text-xs text-accent hover:text-accent/80 font-medium border border-accent/20 px-3 py-1.5 rounded-xl hover:bg-accent/10 transition-colors w-full text-center"
      >
        Manage Teachers
      </button>

      <Dialog open={open} onClose={handleClose} title={`Teachers — ${className}`} wide>
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {activePeriodName && (
            <p className="text-xs text-gray-500 mb-4">
              Active period: <span className="font-medium text-gray-700">{activePeriodName}</span>
            </p>
          )}
          {!activePeriodId && (
            <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
              No active grading period. Domain assignments require an active period.
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">{error}</p>
          )}
          {successMsg && (
            <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-4">✓ {successMsg}</p>
          )}

          {mode === "list" ? (
            <>
              {assignments.length === 0 ? (
                <p className="text-sm text-gray-400 italic mb-4">No teachers assigned yet.</p>
              ) : (
                <div className="space-y-3 mb-4">
                  {assignments.map((a) => (
                    <div key={a.teacherId} className="flex items-start justify-between gap-3 bg-surface rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink">{a.teacherName}</p>
                        {a.areaNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {a.areaNames.map((name) => (
                              <span
                                key={name}
                                className="px-1.5 py-0.5 bg-accent/10 text-accent text-xs rounded-full border border-accent/10"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 mt-0.5">No domains assigned</p>
                        )}
                      </div>
                      <div className="flex gap-3 shrink-0 pt-0.5">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => openEdit(a)}
                          className="text-xs text-accent hover:text-accent/80 font-medium disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleRemove(a.teacherId)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {unassignedTeachers.length > 0 ? (
                <button
                  type="button"
                  onClick={openAdd}
                  className="w-full py-2.5 border border-dashed border-accent/30 text-accent text-sm rounded-xl hover:bg-accent/10 transition-colors"
                >
                  + Assign Teacher
                </button>
              ) : allTeachers.length > 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">All teachers are already assigned to this class.</p>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">No teacher accounts found. Create a teacher account first.</p>
              )}
            </>
          ) : (
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Teacher</label>
                {editingTeacherId ? (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink">
                      {allTeachers.find((t) => t.id === editingTeacherId)?.name}
                    </p>
                    <span className="text-xs text-gray-400">— editing domains</span>
                  </div>
                ) : (
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full bg-surface border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    <option value="">Select teacher…</option>
                    {unassignedTeachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Grading Domains
                  <span className="text-gray-400 font-normal ml-1">(select all they will grade)</span>
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {allAreas.map((area) => (
                    <label key={area.id} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedAreaIds.has(area.id)}
                        onChange={() => toggleArea(area.id)}
                        className="accent-[#036aff] w-4 h-4 shrink-0"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{area.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setMode("list"); setError(null); }}
                  className="flex-1 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 text-sm bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 transition-colors"
                >
                  {isPending ? "Saving…" : editingTeacherId ? "Update Domains" : "Assign"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Dialog>
    </>
  );
}
