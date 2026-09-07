import { notFound } from "next/navigation";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EntryForm } from "@/components/EntryForm";
import { editFoodEntryAction } from "@/app/(app)/log/actions";

export default async function EditEntryPage({
  params,
}: PageProps<"/log/edit/[id]">) {
  const { id } = await params;
  await requireApproved();

  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("food_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!entry) notFound();

  return (
    <div className="max-w-md">
      <h1 className="text-lg mb-6">Edit entry</h1>
      <EntryForm
        action={editFoodEntryAction}
        submitLabel="Save changes"
        initial={{
          id: entry.id,
          name: entry.name,
          quantity: entry.quantity,
          unit: entry.unit ?? "",
          calories: entry.calories,
          proteinG: entry.protein_g,
          carbsG: entry.carbs_g,
          fatG: entry.fat_g,
          mealType: entry.meal_type,
          source: entry.source,
          barcode: entry.barcode ?? undefined,
        }}
      />
    </div>
  );
}
