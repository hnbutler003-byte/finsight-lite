import { Link, useLocation } from "wouter";
import { useOrgAuth } from "@/hooks/use-org-auth";
import { FinsightLiteLogo } from "@/components/FinsightLiteLogo";
import {
  LayoutDashboard, Users, BookOpen, LogOut, Building2, Menu, X, ChevronRight, Award, GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { href: "/org/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/org/students", label: "Students", icon: Users },
  { href: "/org/teachers", label: "Teachers", icon: GraduationCap },
  { href: "/org/lessons", label: "Lessons", icon: BookOpen },
  { href: "/org/branding", label: "Certificate Branding", icon: Award },
];

export function OrgSidebar() {
  const [location] = useLocation();
  const { admin, logout } = useOrgAuth();
  const [open, setOpen] = useState(false);

  const content = (
    <div className="flex flex-col h-full bg-gradient-to-b from-blue-800 via-indigo-900 to-indigo-950 text-white p-4">
      <div className="flex items-center gap-3 mb-8 mt-2">
        <FinsightLiteLogo size={28} className="text-white shrink-0" data-testid="img-logo-org" />
        <div>
          <p className="font-display font-bold text-sm leading-tight text-white">Org Admin</p>
          <p className="text-xs text-blue-100 font-medium truncate max-w-[120px]">{admin?.orgName || "Finsight Lite"}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(item => {
          const active = location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <button
                onClick={() => setOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                  active
                    ? "bg-white/25 shadow text-white"
                    : "text-blue-100 hover:bg-white/10"
                }`}
                data-testid={`nav-org-${item.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            </Link>
          );
        })}
      </nav>

      {admin && (
        <div className="mt-4 border-t border-white/20 pt-4 space-y-3">
          <div className="px-2">
            <p className="font-bold text-sm">{admin.firstName} {admin.lastName}</p>
            <p className="text-xs text-blue-100 truncate">{admin.envName}</p>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-blue-100 hover:bg-white/10 transition-all"
            data-testid="button-logout-org"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex w-64 shrink-0 min-h-screen">{content}</aside>
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button size="icon" variant="outline" onClick={() => setOpen(true)} className="rounded-2xl shadow-lg border-2">
          <Menu className="w-5 h-5" />
        </Button>
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 min-h-full z-50">
            {content}
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 p-2 rounded-xl bg-white/20 hover:bg-white/30">
              <X className="w-4 h-4 text-white" />
            </button>
          </aside>
        </div>
      )}
    </>
  );
}
