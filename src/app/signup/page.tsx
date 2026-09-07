"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type AuthActionState } from "./actions";

const initialState: AuthActionState = { error: null };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialState,
  );

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-numeric mb-1">Calorie+</h1>
        <p className="text-text-muted mb-8">
          Create an account. A founder needs to approve it before you can log
          in.
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm mb-1">
              Name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
            />
          </div>

          {state.error && (
            <p className="text-sm text-protein" role="alert">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-accent px-3 py-2 font-medium text-black disabled:opacity-60"
          >
            {pending ? "Signing up…" : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
