"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions";

type NavItem = { href: string; label: string };

export function NavMenu({
  items,
  isAdmin,
}: {
  items: NavItem[];
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const allItems = isAdmin ? [...items, { href: "/admin", label: "Admin" }] : items;

  return (
    <>
      {/* Desktop: inline nav, unchanged */}
      <nav className="hidden sm:flex items-center gap-4 text-sm">
        {allItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-text-muted hover:text-text"
          >
            {item.label}
          </Link>
        ))}
        <form action={signOutAction}>
          <button type="submit" className="text-text-muted hover:text-text">
            Log out
          </button>
        </form>
      </nav>

      {/* Mobile: hamburger + dropdown panel */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Menu"
        className="sm:hidden flex flex-col justify-center gap-1.5 h-9 w-9 -mr-2"
      >
        <span
          className={`block h-0.5 w-6 bg-text transition-transform ${open ? "translate-y-2 rotate-45" : ""}`}
        />
        <span
          className={`block h-0.5 w-6 bg-text transition-opacity ${open ? "opacity-0" : ""}`}
        />
        <span
          className={`block h-0.5 w-6 bg-text transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`}
        />
      </button>

      {open && (
        <div className="sm:hidden absolute inset-x-0 top-full border-b border-hairline bg-bg z-10">
          <nav className="flex flex-col px-6 py-2 text-sm">
            {allItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`py-3 border-b border-hairline last:border-0 ${
                  pathname === item.href ? "text-text" : "text-text-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full text-left py-3 text-text-muted"
              >
                Log out
              </button>
            </form>
          </nav>
        </div>
      )}
    </>
  );
}
