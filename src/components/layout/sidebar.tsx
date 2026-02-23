"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/applications", label: "Applications" },
  { href: "/dashboard/companies", label: "Companies" },
  { href: "/dashboard/contacts", label: "Contacts" },
  { href: "/dashboard/documents", label: "Documents" },
  { href: "/dashboard/templates", label: "Templates" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/settings", label: "Settings" },
];

type SidebarProps = {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (mobileOpen) onCloseMobile?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function onSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    document.cookie = "jobcrm_token=; path=/; max-age=0; SameSite=Lax";
    router.replace("/login");
  }

  const navContent = (
    <>
      <div className="border-b border-stone-700 px-5 py-4">
        <p className="text-sm font-semibold text-stone-100">Career Command</p>
        <p className="text-xs text-stone-400">Premium application CRM</p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm",
                active ? "bg-stone-700 text-stone-100" : "text-stone-300 hover:bg-stone-800",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-stone-700 p-3">
        <Button variant="secondary" className="w-full" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-stone-700 bg-stone-900 lg:flex">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-black/45"
            onClick={onCloseMobile}
          />
          <aside className="relative h-full w-72 max-w-[82vw] border-r border-stone-700 bg-stone-900 shadow-xl">
            <div className="flex items-center justify-end border-b border-stone-700 p-2">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-600 text-stone-100 hover:bg-stone-800"
                aria-label="Close navigation menu"
                onClick={onCloseMobile}
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex h-[calc(100%-42px)] flex-col">{navContent}</div>
          </aside>
        </div>
      )}
    </>
  );
}
