import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-4xl font-numeric mb-3">Calorie+</h1>
      <p className="text-text-muted max-w-sm mb-8">
        Calorie and macro tracking for gym-goers — search, scan, or snap a
        photo of your food.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md border border-hairline px-4 py-2 text-sm"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
