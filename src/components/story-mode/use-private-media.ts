"use client";

import { useEffect, useState } from "react";

export function accessDenied(status: number) {
  return status === 401 || status === 403 || status === 404;
}

/** Fetch once per active page; keep neither signed/public URLs nor a media cache. */
export function usePrivateMedia(source: string | null, retry: number, onDenied: () => void) {
  const [result, setResult] = useState<{ source: string; retry: number; url: string | null; error: boolean } | null>(null);
  useEffect(() => {
    if (!source) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    void (async () => {
      try {
        const response = await fetch(source, { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        if (accessDenied(response.status)) {
          onDenied();
          return;
        }
        if (!response.ok) throw new Error("MEDIA");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setResult({ source, retry, url: objectUrl, error: false });
      } catch {
        if (!controller.signal.aborted) setResult({ source, retry, url: null, error: true });
      }
    })();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source, retry, onDenied]);
  const current = result?.source === source && result.retry === retry ? result : null;
  return { url: current?.url || null, error: current?.error || false, loading: Boolean(source && !current) };
}
