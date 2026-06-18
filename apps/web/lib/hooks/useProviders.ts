"use client";

import { useState, useEffect } from "react";

interface ProviderStatus {
  anthropic: { configured: boolean; model: string };
  ollama:    { configured: boolean; online: boolean; endpoint: string };
  active:    "anthropic" | "ollama" | "none";
}

export function useProviders() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data: ProviderStatus) => setStatus(data))
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  return { status, loading };
}
