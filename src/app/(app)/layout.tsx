import Link from "next/link";
import { requireApproved } from "@/lib/auth";
import { signOutAction } from "@/app/actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Today" },
  { href: "/log/search", label: "Log food" },
  { href: "/trends", label: "Trends" },
  { href: "/settings", label: "Settings" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Second enforcement layer (spec 3.2): even if src/proxy.ts were bypassed,
  // no page under this layout renders for a non-approved user.
  const user = await requireApproved();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-numeric text-lg">
            Calorie+
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-text-muted hover:text-text"
              >
                {item.label}
              </Link>
            ))}
            {user.profile.role === "admin" && (
              <Link href="/admin" className="text-text-muted hover:text-text">
                Admin
              </Link>
            )}
            <form action={signOutAction}>
              <button type="submit" className="text-text-muted hover:text-text">
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
