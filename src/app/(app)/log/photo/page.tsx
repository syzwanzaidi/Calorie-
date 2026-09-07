import { PhotoLogger } from "@/components/PhotoLogger";

export default function PhotoLogPage() {
  return (
    <div className="max-w-md">
      <h1 className="text-lg mb-6">Log from a photo</h1>
      <PhotoLogger />
    </div>
  );
}
