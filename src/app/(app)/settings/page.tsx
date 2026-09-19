import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTargets } from "@/lib/data/targets";
import { getLatestWeight } from "@/lib/data/weight";
import { listMyGeminiKeys } from "@/lib/data/apiKeys";
import { ProfileForm } from "@/components/ProfileForm";
import { TargetsPanel } from "@/components/TargetsPanel";
import { WeightLogForm } from "@/components/WeightLogForm";
import { ApiKeysPanel } from "@/components/ApiKeysPanel";

export default async function SettingsPage() {
  const user = await requireApproved();
  const supabase = await createClient();

  const [targets, latestWeight, geminiKeys] = await Promise.all([
    getCurrentTargets(supabase, user.id),
    getLatestWeight(supabase, user.id),
    listMyGeminiKeys(supabase, user.id),
  ]);

  return (
    <div className="max-w-lg space-y-10">
      <section>
        <h1 className="text-lg mb-4">Profile</h1>
        <ProfileForm profile={user.profile} />
      </section>

      <section>
        <h2 className="text-lg mb-4">Weight</h2>
        <WeightLogForm latestWeightKg={latestWeight?.weight_kg ?? null} />
      </section>

      <section>
        <h2 className="text-lg mb-4">Targets</h2>
        <TargetsPanel current={targets} />
      </section>

      <section>
        <h2 className="text-lg mb-4">AI photo analysis</h2>
        <ApiKeysPanel keys={geminiKeys} />
      </section>
    </div>
  );
}
