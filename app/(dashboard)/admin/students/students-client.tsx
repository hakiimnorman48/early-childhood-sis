"use client";

import { useRef, useState, useTransition } from "react";
import { updateStudent, updateParentContact, assignPicTeacher } from "@/app/actions/students";
import { X } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
}

interface TeacherOption {
  id: string;
  name: string;
}

interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
}

interface StudentRow {
  id: string;
  fullName: string;
  nickname: string | null;
  dateOfBirth: Date;
  classId: string;
  parent: Parent | null;
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
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

export function EditStudentButton({
  student,
  classes,
}: {
  student: StudentRow;
  classes: ClassOption[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [parentPending, startParentTransition] = useTransition();
  const [parentError, setParentError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"student" | "parent">("student");

  const dobStr = student.dateOfBirth instanceof Date
    ? student.dateOfBirth.toISOString().split("T")[0]
    : String(student.dateOfBirth).split("T")[0];

  function handleStudentSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateStudent(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  function handleParentSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setParentError(null);
    const fd = new FormData(e.currentTarget);
    startParentTransition(async () => {
      const result = await updateParentContact(fd);
      if (result?.error) {
        setParentError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(null); setParentError(null); setActiveTab("student"); }}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
      >
        Edit
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title={`Edit — ${student.fullName}`}>
        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {(["student", "parent"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "student" ? "Student Data" : "Parent Contact"}
            </button>
          ))}
        </div>

        {activeTab === "student" && (
          <form onSubmit={handleStudentSubmit} className="p-6 space-y-4">
            <input type="hidden" name="studentId" value={student.id} />
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <input
                name="fullName"
                required
                defaultValue={student.fullName}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nickname / Preferred Name</label>
              <input
                name="nickname"
                defaultValue={student.nickname ?? ""}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
              <input
                name="dateOfBirth"
                type="date"
                required
                defaultValue={dobStr}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
              <select
                name="classId"
                required
                defaultValue={student.classId}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}

        {activeTab === "parent" && (
          <form onSubmit={handleParentSubmit} className="p-6 space-y-4">
            {student.parent ? (
              <>
                <input type="hidden" name="parentId" value={student.parent.id} />
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600 mb-2">
                  <p className="font-medium text-gray-800">{student.parent.name}</p>
                  <p className="text-xs text-gray-400">{student.parent.email}</p>
                </div>
                {parentError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{parentError}</p>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={student.parent.phone ?? ""}
                    placeholder="+62 812 …"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Home Address</label>
                  <textarea
                    name="address"
                    rows={3}
                    defaultValue={student.parent.address ?? ""}
                    placeholder="Jl. …"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={parentPending} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    {parentPending ? "Saving…" : "Save Contact"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 py-4">No parent account linked to this student.</p>
            )}
          </form>
        )}
      </Dialog>
    </>
  );
}

export function AssignPicButton({
  studentId,
  currentPicId,
  teachers,
}: {
  studentId: string;
  currentPicId: string | null;
  teachers: TeacherOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setError(null);
    const fd = new FormData();
    fd.set("studentId", studentId);
    fd.set("picTeacherId", e.target.value);
    startTransition(async () => {
      const result = await assignPicTeacher(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-0.5">
      <select
        defaultValue={currentPicId ?? ""}
        onChange={handleChange}
        disabled={isPending}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 bg-white min-w-[130px]"
      >
        <option value="">— Unassigned —</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
