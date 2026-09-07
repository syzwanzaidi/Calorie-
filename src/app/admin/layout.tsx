import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { signOutAction } from "@/app/actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Second enforcement layer (spec 3.4): role = 'admin' is re-checked here,
  // independent of src/proxy.ts.
  await requireAdmin();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="font-numeric text-lg">
            Calorie+ Admin
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-text-muted hover:text-text">
              Back to app
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="text-text-muted hover:text-text">
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
