/**
 * GET /api/providers
 * Returns which AI providers are configured and available.
 * Used by the UI to show status indicators.
 */

import { NextResponse } from "next/server";
import { availableProviders } from "@/lib/model-router";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = availableProviders();

  // Check Ollama health
  let ollamaOnline = false;
  try {
    const res = await fetch(
      `${process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"}/api/tags`,
      { signal: AbortSignal.timeout(2_000) },
    );
    ollamaOnline = res.ok;
  } catch { /* offline */ }

  return NextResponse.json({
    anthropic: { configured: providers.anthropic, model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-5" },
    ollama:    { configured: true, online: ollamaOnline, endpoint: providers.ollama },
    active:    providers.anthropic ? "anthropic" : ollamaOnline ? "ollama" : "none",
  });
}
