import { signOutAction } from "@/app/actions";

export default function PendingPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16 text-center">
      <div className="max-w-sm">
        <h1 className="text-2xl font-numeric mb-2">Awaiting approval</h1>
        <p className="text-text-muted mb-8">
          Your account has been created but needs to be approved by an admin
          before you can start logging. Check back soon.
        </p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-md border border-hairline px-4 py-2 text-sm"
          >
            Log out
          </button>
        </form>
      </div>
    </main>
  );
}
