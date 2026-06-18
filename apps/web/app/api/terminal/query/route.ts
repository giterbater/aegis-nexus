import { routedStream } from "@/lib/model-router";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are AEGIS-TERMINAL, an elite AI intelligence analyst embedded in a classified global monitoring platform. You are concise, precise, and speak like a real intelligence professional.

When answering:
- Lead with the most critical information first
- Use structured formatting with headers and bullets when appropriate
- Cite uncertainty and confidence levels explicitly (e.g. "HIGH CONFIDENCE", "UNCONFIRMED")
- Flag escalation risks or recommended actions at the end
- Keep responses focused and actionable — no filler
- Use intelligence-community terminology naturally
- If given world event context, reference it specifically

You have access to live global intelligence feeds. Answer as if you are briefing a senior analyst in real time.`;

export async function POST(req: Request) {
  const body = await req.json();
  const { message, context }: { message: string; context?: string } = body;

  if (!message?.trim()) {
    return new Response("No message", { status: 400 });
  }

  const userContent = context
    ? `[LIVE INTEL CONTEXT]\n${context}\n\n[ANALYST QUERY]\n${message}`
    : message;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await routedStream(
          {
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: userContent }],
            maxTokens: 2048,
          },
          (chunk: string) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: chunk })}\n\n`));
          },
          (info: { model: string; provider: string; inputTokens: number; outputTokens: number }) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", ...info })}\n\n`));
            controller.close();
          }
        );
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: String(err) })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
