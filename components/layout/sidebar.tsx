"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  CalendarCheck,
  Settings,
  LogOut,
  GraduationCap,
  BarChart3,
  Bell,
  School,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

const adminNav: NavItem[] = [
  { href: "/admin", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { href: "/admin/classes", icon: <School size={18} />, label: "Classes" },
  { href: "/admin/students", icon: <Users size={18} />, label: "Students" },
  { href: "/admin/accounts", icon: <Settings size={18} />, label: "Accounts" },
  { href: "/admin/periods", icon: <CalendarCheck size={18} />, label: "Grading Periods" },
];

const teacherNav: NavItem[] = [
  { href: "/teacher", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { href: "/teacher/gradebook", icon: <BookOpen size={18} />, label: "Gradebook" },
  { href: "/teacher/attendance", icon: <ClipboardList size={18} />, label: "Attendance" },
];

const parentNav: NavItem[] = [
  { href: "/parent", icon: <BarChart3 size={18} />, label: "My Child" },
  { href: "/parent/reports", icon: <GraduationCap size={18} />, label: "Reports" },
  { href: "/parent/announcements", icon: <Bell size={18} />, label: "Announcements" },
];

const navByRole: Record<string, NavItem[]> = {
  admin: adminNav,
  teacher: teacherNav,
  parent: parentNav,
};

interface SidebarProps {
  role: string;
  userName: string;
  schoolName: string;
}

export function Sidebar({ role, userName, schoolName }: SidebarProps) {
  const pathname = usePathname();
  const nav = navByRole[role] ?? [];

  const roleLabel =
    role === "admin" ? "Administrator" : role === "teacher" ? "Teacher" : "Parent";

  const roleBadgeColor =
    role === "admin"
      ? "bg-purple-100 text-purple-700"
      : role === "teacher"
      ? "bg-accent/10 text-accent"
      : "bg-teal-100 text-teal-700";

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-white border-r border-gray-100 text-ink shrink-0 print:hidden">
      {/* Header */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center font-bold text-sm text-white shrink-0">
            {schoolName.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="font-semibold text-sm text-ink truncate">{schoolName}</p>
            <p className="text-xs text-gray-400">Early Childhood SIS</p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-gray-100">
        <span className={cn("inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-1.5", roleBadgeColor)}>
          {roleLabel}
        </span>
        <p className="text-sm font-semibold text-ink truncate">{userName}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const isActive =
            item.href === `/${role}`
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-white"
                  : "text-gray-500 hover:bg-surface hover:text-ink"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-surface hover:text-ink w-full transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
