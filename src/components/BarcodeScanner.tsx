"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { SearchLogger } from "@/components/SearchLogger";
import type { OFFProduct } from "@/lib/openfoodfacts";

export function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [product, setProduct] = useState<OFFProduct | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);

  useEffect(() => {
    if (product) return; // stop scanning once we have a match to confirm

    let cancelled = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        if (cancelled || !videoRef.current) return;

        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          async (result) => {
            if (!result || lookingUp) return;
            const code = result.getText();
            setLookingUp(true);
            controlsRef.current?.stop();
            try {
              const res = await fetch(
                `/api/food-barcode?code=${encodeURIComponent(code)}`,
              );
              if (res.ok) {
                const data = await res.json();
                setProduct(data.product);
              } else {
                setNotFoundCode(code);
              }
            } finally {
              setLookingUp(false);
            }
          },
        );
        controlsRef.current = controls;
      } catch {
        if (!cancelled) {
          setError(
            "Couldn't access the camera. Check permissions and try again.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  if (product) {
    return <SearchLogger initialProduct={product} />;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border border-hairline bg-black aspect-video">
        <video ref={videoRef} className="h-full w-full object-cover" />
      </div>

      {lookingUp && (
        <p className="text-sm text-text-muted">Looking up product…</p>
      )}
      {error && (
        <p className="text-sm text-protein" role="alert">
          {error}
        </p>
      )}
      {notFoundCode && (
        <p className="text-sm text-text-muted">
          No match for barcode {notFoundCode}. Try{" "}
          <a href="/log/search" className="text-accent underline">
            searching manually
          </a>
          .
        </p>
      )}
      <p className="text-xs text-text-muted">
        Point the camera at a barcode. It scans automatically.
      </p>
    </div>
  );
}
