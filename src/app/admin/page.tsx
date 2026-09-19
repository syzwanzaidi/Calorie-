import { createAdminClient } from "@/lib/supabase/server";
import { listAllProfiles, getUsageStats } from "@/lib/data/admin";
import { listGeminiKeys } from "@/lib/data/apiKeys";
import {
  approveUserAction,
  rejectUserAction,
  suspendUserAction,
  reinstateUserAction,
} from "@/app/admin/actions";
import { ApiKeysPanel } from "@/components/ApiKeysPanel";

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "approved"
      ? "var(--accent)"
      : status === "pending"
        ? "var(--carbs)"
        : "var(--protein)";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs border"
      style={{ color, borderColor: "var(--hairline)" }}
    >
      {status}
    </span>
  );
}

export default async function AdminPage() {
  const adminClient = createAdminClient();
  const [profiles, usage, geminiKeys] = await Promise.all([
    listAllProfiles(adminClient),
    getUsageStats(adminClient),
    listGeminiKeys(adminClient),
  ]);

  const pending = profiles.filter((p) => p.status === "pending");

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-lg mb-4">
          Pending approvals{" "}
          {pending.length > 0 && (
            <span className="text-text-muted font-normal">({pending.length})</span>
          )}
        </h1>

        {pending.length === 0 ? (
          <p className="text-sm text-text-muted">No pending sign-ups.</p>
        ) : (
          <ul className="divide-y divide-hairline border border-hairline rounded-md">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate">{p.display_name || "(no name)"}</p>
                  <p className="text-xs text-text-muted">
                    Signed up {new Date(p.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <form action={approveUserAction.bind(null, p.id)}>
                    <button
                      type="submit"
                      className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectUserAction.bind(null, p.id)}>
                    <button
                      type="submit"
                      className="rounded-md border border-hairline px-3 py-1.5 text-sm hover:border-protein hover:text-protein"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg mb-4">All users</h2>
        <div className="overflow-x-auto border border-hairline rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-hairline">
                <th className="px-4 py-2 font-normal">Name</th>
                <th className="px-4 py-2 font-normal">Status</th>
                <th className="px-4 py-2 font-normal">Role</th>
                <th className="px-4 py-2 font-normal">Entries</th>
                <th className="px-4 py-2 font-normal">Last active</th>
                <th className="px-4 py-2 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const stats = usage.get(p.id);
                return (
                  <tr key={p.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-3">{p.display_name || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-text-muted">{p.role}</td>
                    <td className="px-4 py-3 font-numeric">
                      {stats?.entryCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {stats?.lastActiveAt
                        ? new Date(stats.lastActiveAt).toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {p.status === "approved" && p.role !== "admin" && (
                          <form action={suspendUserAction.bind(null, p.id)}>
                            <button
                              type="submit"
                              className="text-xs text-text-muted hover:text-protein"
                            >
                              Suspend
                            </button>
                          </form>
                        )}
                        {(p.status === "suspended" || p.status === "rejected") && (
                          <form action={reinstateUserAction.bind(null, p.id)}>
                            <button
                              type="submit"
                              className="text-xs text-text-muted hover:text-accent"
                            >
                              Reinstate
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg mb-4">AI photo analysis</h2>
        <ApiKeysPanel keys={geminiKeys} />
      </section>
    </div>
  );
}
