/**
 * POST /api/agents/analyze
 * Streams a multi-stage AI analysis of an intelligence event.
 * Provider: Anthropic (with prompt caching) → Ollama fallback.
 *
 * Body: { event: GeoEvent, stage: "research" | "risk" | "summary" }
 * Response: SSE stream  (text/event-stream)
 */

import { NextRequest } from "next/server";
import { routedStream, availableProviders } from "@/lib/model-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAGE_SYSTEMS: Record<string, string> = {
  research: `You are DEEP-RESEARCH, an advanced OSINT intelligence analyst for AEGIS NEXUS.
Analyse the provided intelligence event. Structure your response as:
**ASSESSMENT** — 2-3 sentence threat evaluation
**KEY INDICATORS** — 3-5 bullet points of significant signals
**CONTEXT** — geopolitical/historical background (2-3 sentences)
**UNCERTAINTIES** — what is unknown or unverified
**CONFIDENCE** — overall confidence percentage and rationale
Be precise, direct, and intelligence-grade. No filler text.`,

  risk: `You are RISKMETRIC, a geopolitical risk modelling engine for AEGIS NEXUS.
Assess escalation risk for the provided event. Structure your response as:
**THREAT SCORE** — 0-100 with justification
**ESCALATION PROBABILITY** — % likelihood of escalation within 72h / 7d / 30d
**SCENARIOS** — 2 plausible outcome scenarios (best/worst case)
**KEY RISK INDICATORS** — 3 signals to monitor
**RECOMMENDED POSTURE** — actionable intelligence stance
Be probabilistic, calibrated, and concise.`,

  summary: `You are BRIEFER, an executive intelligence summariser for AEGIS NEXUS.
Generate a classified executive brief for the provided event. Structure as:
**EXECUTIVE SUMMARY** — 3 sentences maximum, decision-maker level
**CRITICAL FINDINGS** — 3 bullet points
**IMMEDIATE ACTIONS** — 2-3 recommended responses
**CLASSIFICATION** — recommended classification level and rationale
Write for a senior analyst. Clarity over completeness.`,
};

export async function POST(req: NextRequest) {
  let body: { event?: Record<string, unknown>; stage?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { event, stage = "research" } = body;
  if (!event) {
    return new Response(JSON.stringify({ error: "event is required" }), { status: 400 });
  }

  const system = STAGE_SYSTEMS[stage] ?? STAGE_SYSTEMS.research;

  const userMessage = `INTELLIGENCE EVENT — CLASSIFICATION: UNCLASSIFIED//FOUO

Title: ${event.title ?? "Unknown"}
Category: ${event.category ?? "Unknown"}
Threat Level: ${event.threat ?? "Unknown"}
Country: ${event.country ?? "Unknown"} | Region: ${event.region ?? "Unknown"}
Timestamp: ${event.timestamp ?? new Date().toISOString()}
Confidence: ${event.confidence ?? "N/A"}%

Summary:
${event.summary ?? "No summary available"}

Sources: ${Array.isArray(event.sources) ? (event.sources as string[]).join(", ") : "Unknown"}
Tags: ${Array.isArray(event.tags) ? (event.tags as string[]).join(", ") : "None"}

Conduct your ${stage} analysis now.`;

  // Build SSE stream
  const encoder = new TextEncoder();
  const providers = availableProviders();

  const stream = new ReadableStream({
    async start(controller) {
      // Send metadata event first
      const meta = {
        type: "meta",
        stage,
        providers,
        eventId: event.id,
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(meta)}\n\n`));

      let activeProvider: "anthropic" | "ollama" = "ollama";

      try {
        activeProvider = await routedStream(
          {
            system,
            messages: [{ role: "user", content: userMessage }],
            maxTokens: 1024,
            stream: true,
          },
          (chunk) => {
            const payload = { type: "chunk", text: chunk };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          },
          (done) => {
            const payload = {
              type: "done",
              model: done.model,
              provider: done.provider,
              inputTokens: done.inputTokens,
              outputTokens: done.outputTokens,
              cached: done.cached,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          },
        );
      } catch (err) {
        const errPayload = {
          type: "error",
          message: err instanceof Error ? err.message : "Analysis failed",
          provider: activeProvider,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errPayload)}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
