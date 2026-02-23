"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

type TopBarProps = {
  onOpenMobileNav?: () => void;
};

export function TopBar({ onOpenMobileNav }: TopBarProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/dashboard/applications?q=${encodeURIComponent(q)}` : "/dashboard/applications");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-stone-700 bg-stone-900/95 px-3 py-3 backdrop-blur sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 sm:flex-1">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-stone-600 bg-stone-800 text-stone-100 hover:bg-stone-700 lg:hidden"
            aria-label="Open navigation menu"
            onClick={onOpenMobileNav}
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          <form onSubmit={onSubmit} className="w-full max-w-xl sm:w-auto sm:flex-1">
            <Input
              aria-label="Global application search"
              placeholder="Search applications by company or role"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="border-stone-600 bg-stone-800 text-stone-100 placeholder:text-stone-400 focus:border-stone-400 focus:ring-stone-500/30"
            />
          </form>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
          <Button className="w-full sm:w-auto" variant="secondary" onClick={() => router.push("/dashboard/applications/new")}>New application</Button>
          <Button className="w-full sm:w-auto" onClick={() => router.push("/dashboard/templates")}>Quick templates</Button>
        </div>
      </div>
    </header>
  );
}
