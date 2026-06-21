"use client";

import { useRef, useState, useTransition } from "react";
import { createAccount, updateAccount } from "@/app/actions/accounts";
import { assignTeacher, removeTeacherFromClass } from "@/app/actions/classes";
import { X } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface TeacherAssignment {
  classId: string;
  className: string;
  areaIds: string[];
  areaNames: string[];
}

interface TeacherData {
  assignments: TeacherAssignment[];
  availableClasses: Array<{ id: string; name: string }>;
  availableAreas: Array<{ id: string; name: string }>;
  activePeriodId: string | null;
}

function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CreateAccountButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createAccount(fd);
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
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        + Create Account
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Create Account">
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
            <input name="name" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input name="email" type="email" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
            <input name="password" type="password" required minLength={6} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select name="role" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Select role…</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {isPending ? "Creating…" : "Create Account"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function EditAccountButton({
  user,
  teacherData,
}: {
  user: User;
  teacherData?: TeacherData;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"account" | "assignments">("account");

  // Account form state
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isAccountPending, startAccountTransition] = useTransition();

  // Assignment form state
  const [assignMode, setAssignMode] = useState<"list" | "form">("list");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<string>>(new Set());
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [isAssignPending, startAssignTransition] = useTransition();

  const isTeacher = user.role === "teacher";

  function handleClose() {
    setOpen(false);
    setTab("account");
    setAccountError(null);
    setAssignMode("list");
    setAssignError(null);
    setAssignSuccess(null);
  }

  function handleAccountSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAccountError(null);
    const fd = new FormData(e.currentTarget);
    startAccountTransition(async () => {
      const result = await updateAccount(fd);
      if (result?.error) {
        setAccountError(result.error);
      } else {
        handleClose();
      }
    });
  }

  function openAddAssignment() {
    setAssignMode("form");
    setEditingClassId(null);
    setSelectedClassId("");
    setSelectedAreaIds(new Set());
    setAssignError(null);
  }

  function openEditAssignment(a: TeacherAssignment) {
    setAssignMode("form");
    setEditingClassId(a.classId);
    setSelectedClassId(a.classId);
    setSelectedAreaIds(new Set(a.areaIds));
    setAssignError(null);
  }

  function toggleArea(areaId: string) {
    setSelectedAreaIds((prev) => {
      const next = new Set(prev);
      next.has(areaId) ? next.delete(areaId) : next.add(areaId);
      return next;
    });
  }

  function handleAssignSubmit(e: React.FormEvent) {
    e.preventDefault();
    const classId = selectedClassId;
    if (!classId) { setAssignError("Select a class."); return; }
    if (!teacherData?.activePeriodId) { setAssignError("No active grading period."); return; }

    const fd = new FormData();
    fd.set("classId", classId);
    fd.set("teacherId", user.id);
    for (const id of selectedAreaIds) fd.append("areaId", id);

    startAssignTransition(async () => {
      const result = await assignTeacher(fd);
      if (result?.error) {
        setAssignError(result.error);
      } else {
        setAssignMode("list");
        setAssignSuccess("Assignment saved.");
        setTimeout(() => setAssignSuccess(null), 3000);
      }
    });
  }

  function handleRemoveAssignment(classId: string) {
    const fd = new FormData();
    fd.set("classId", classId);
    fd.set("teacherId", user.id);
    startAssignTransition(async () => {
      const result = await removeTeacherFromClass(fd);
      if (result?.error) setAssignError(result.error);
    });
  }

  const assignments = teacherData?.assignments ?? [];
  const assignedClassIds = new Set(assignments.map((a) => a.classId));
  const availableClasses = teacherData?.availableClasses ?? [];
  const unassignedClasses = availableClasses.filter((c) => !assignedClassIds.has(c.id));

  return (
    <>
      <button
        onClick={() => { setOpen(true); setTab("account"); setAccountError(null); }}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
      >
        Edit
      </button>

      <Dialog open={open} onClose={handleClose} title={`Edit — ${user.name}`}>
        {/* Tabs (only for teachers) */}
        {isTeacher && (
          <div className="flex border-b border-gray-100">
            {(["account", "assignments"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors capitalize ${
                  tab === t
                    ? "text-indigo-600 border-b-2 border-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "account" ? "Account" : "Assignments"}
              </button>
            ))}
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto">
          {/* ── Account tab ── */}
          {tab === "account" && (
            <form onSubmit={handleAccountSubmit} className="p-6 space-y-4">
              <input type="hidden" name="userId" value={user.id} />
              {accountError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{accountError}</p>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                <input name="name" required defaultValue={user.name} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input name="email" type="email" required defaultValue={user.email} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select name="role" required defaultValue={user.role} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="teacher">Teacher</option>
                  <option value="parent">Parent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select name="isActive" defaultValue={user.isActive ? "true" : "false"} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  New Password <span className="text-gray-400">(leave blank to keep current)</span>
                </label>
                <input name="newPassword" type="password" minLength={6} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={handleClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={isAccountPending} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {isAccountPending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* ── Assignments tab ── */}
          {tab === "assignments" && isTeacher && (
            <div className="p-6">
              {!teacherData?.activePeriodId && (
                <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  No active grading period. Assignments require an active period.
                </div>
              )}

              {assignError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{assignError}</p>
              )}
              {assignSuccess && (
                <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">✓ {assignSuccess}</p>
              )}

              {assignMode === "list" ? (
                <>
                  {assignments.length === 0 ? (
                    <p className="text-sm text-gray-400 italic mb-4">No class assignments yet.</p>
                  ) : (
                    <div className="space-y-3 mb-4">
                      {assignments.map((a) => (
                        <div key={a.classId} className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl p-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{a.className}</p>
                            {a.areaNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1.5">
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
                              <p className="text-xs text-gray-400 mt-0.5">No domains assigned</p>
                            )}
                          </div>
                          <div className="flex gap-3 shrink-0 pt-0.5">
                            <button
                              type="button"
                              disabled={isAssignPending}
                              onClick={() => openEditAssignment(a)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={isAssignPending}
                              onClick={() => handleRemoveAssignment(a.classId)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {unassignedClasses.length > 0 ? (
                    <button
                      type="button"
                      onClick={openAddAssignment}
                      className="w-full py-2.5 border border-dashed border-indigo-300 text-indigo-600 text-sm rounded-xl hover:bg-indigo-50 transition-colors"
                    >
                      + Assign to Class
                    </button>
                  ) : availableClasses.length > 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">
                      This teacher is assigned to all classes. Edit an existing assignment to change domains.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-2">No classes found.</p>
                  )}
                </>
              ) : (
                <form onSubmit={handleAssignSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Class</label>
                    {editingClassId ? (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {assignments.find((a) => a.classId === editingClassId)?.className ?? editingClassId}
                        </p>
                        <span className="text-xs text-gray-400">— editing domains</span>
                      </div>
                    ) : (
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      >
                        <option value="">Select class…</option>
                        {unassignedClasses.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Grading Domains
                      <span className="text-gray-400 font-normal ml-1">(select all that apply)</span>
                    </label>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {(teacherData?.availableAreas ?? []).map((area) => (
                        <label key={area.id} className="flex items-center gap-2.5 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selectedAreaIds.has(area.id)}
                            onChange={() => toggleArea(area.id)}
                            className="accent-indigo-600 w-4 h-4 shrink-0"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900">{area.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setAssignMode("list"); setAssignError(null); }}
                      className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAssignPending}
                      className="flex-1 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {isAssignPending ? "Saving…" : editingClassId ? "Update Domains" : "Assign"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
