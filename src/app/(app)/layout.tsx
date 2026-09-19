import Link from "next/link";
import { requireApproved } from "@/lib/auth";
import { NavMenu } from "@/components/NavMenu";

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
      <header className="relative border-b border-hairline">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-numeric text-lg shrink-0">
            Calorie+
          </Link>
          <NavMenu items={NAV_ITEMS} isAdmin={user.profile.role === "admin"} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
