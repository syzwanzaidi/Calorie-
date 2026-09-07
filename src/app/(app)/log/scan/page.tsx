import { BarcodeScanner } from "@/components/BarcodeScanner";

export default function ScanLogPage() {
  return (
    <div className="max-w-md">
      <h1 className="text-lg mb-6">Scan barcode</h1>
      <BarcodeScanner />
    </div>
  );
}
