"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/", icon: "smart_toy", label: "AI Assistant" },
  { href: "/tasks", icon: "check_circle", label: "Tasks" },
  { href: "/calendar", icon: "calendar_today", label: "Calendar" },
  { href: "/timetable", icon: "schedule", label: "Timetable" },
  { href: "/focus", icon: "timer", label: "Focus Mode" },
  { href: "/story", icon: "auto_stories", label: "Story Mode" },
  { href: "/diary", icon: "menu_book", label: "Diary" },
  { href: "/reports", icon: "bar_chart", label: "Reports" },
];

export default function FloatingDock() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-end gap-2 p-2 bg-surface-container-lowest/70 backdrop-blur-md border border-outline-variant/30 shadow-2xl rounded-2xl">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 origin-bottom hover:-translate-y-2 hover:scale-125 ${
              isActive
                ? "bg-primary-fixed"
                : "hover:bg-primary-fixed/50"
            }`}
          >
            <span
              className={`material-symbols-outlined text-2xl transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-on-surface-variant group-hover:text-primary"
              }`}
            >
              {item.icon}
            </span>
            <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-inverse-surface text-inverse-on-surface text-label-caps rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
              {item.label}
            </span>
          </Link>
        );
      })}
      <div className="w-px h-8 bg-outline-variant/30 my-auto mx-1" />
      <Link
        href="/settings"
        className={`group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 origin-bottom hover:-translate-y-2 hover:scale-125 ${
          pathname.startsWith("/settings")
            ? "bg-primary-fixed"
            : "hover:bg-primary-fixed/50"
        }`}
      >
        <span
          className={`material-symbols-outlined text-2xl transition-colors ${
            pathname.startsWith("/settings")
              ? "text-primary"
              : "text-on-surface-variant group-hover:text-primary"
          }`}
        >
          settings
        </span>
        <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-inverse-surface text-inverse-on-surface text-label-caps rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
          Settings
        </span>
      </Link>
    </nav>
  );
}
