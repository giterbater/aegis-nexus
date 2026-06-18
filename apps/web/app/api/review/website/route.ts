import { routedStream } from "@/lib/model-router";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are AEGIS-WEBINT, an expert website intelligence analyst specializing in educational content analysis. You analyze websites thoroughly and provide structured, actionable intelligence reports.

Your analysis must be precise, educational, and structured. You evaluate websites across multiple dimensions:
- Content Quality & Accuracy
- Educational Value & Learning Potential
- Design & User Experience
- Trust & Credibility Signals
- Accessibility & Inclusivity
- Navigation & Structure
- Technical Quality indicators

Always respond in strict JSON format with no extra text before or after the JSON block.`;

function buildPrompt(url: string, html: string, title: string, description: string): string {
  // Trim HTML to extract meaningful text (first ~4000 chars of visible content)
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);

  return `Analyze this website for educational purposes.

URL: ${url}
TITLE: ${title || "Unknown"}
META DESCRIPTION: ${description || "None"}
PAGE CONTENT SAMPLE:
${text}

Return ONLY a JSON object in exactly this format (no markdown fences, no extra text):
{
  "overallScore": <0-100 integer>,
  "verdict": "<one sentence overall verdict>",
  "category": "<primary category: News / Education / Research / Government / Commercial / Social / Entertainment / Reference / Tech / Other>",
  "strongPoints": [
    "<specific strong point 1>",
    "<specific strong point 2>",
    "<specific strong point 3>",
    "<specific strong point 4>",
    "<specific strong point 5>"
  ],
  "weakPoints": [
    "<specific weak point 1>",
    "<specific weak point 2>",
    "<specific weak point 3>",
    "<specific weak point 4>",
    "<specific weak point 5>"
  ],
  "scores": {
    "contentQuality": <0-100>,
    "educationalValue": <0-100>,
    "designUX": <0-100>,
    "credibility": <0-100>,
    "accessibility": <0-100>
  },
  "educationalNotes": "<2-3 sentences on how this site can be used for learning>",
  "targetAudience": "<who benefits most from this site>",
  "recommendation": "<HIGHLY RECOMMENDED | RECOMMENDED | USE WITH CAUTION | NOT RECOMMENDED>"
}`;
}

async function fetchSite(url: string): Promise<{ html: string; title: string; description: string; finalUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AEGIS-WEBINT/1.0; educational-analyzer)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    const html = await res.text();
    const finalUrl = res.url ?? url;

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 200) : "";

    // Extract meta description
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim().slice(0, 400) : "";

    return { html, title, description, finalUrl };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { url }: { url: string } = body;

  if (!url?.trim()) {
    return new Response(JSON.stringify({ error: "No URL provided" }), { status: 400 });
  }

  // Normalise URL
  let normalised = url.trim();
  if (!/^https?:\/\//i.test(normalised)) normalised = "https://" + normalised;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        // Step 1: Fetch the site
        send({ type: "status", message: "FETCHING TARGET URL…" });
        let siteData: Awaited<ReturnType<typeof fetchSite>>;
        try {
          siteData = await fetchSite(normalised);
        } catch {
          send({ type: "status", message: "DIRECT FETCH BLOCKED — ANALYSING FROM URL INTEL…" });
          // Use URL-only analysis if fetch fails
          siteData = { html: "", title: "", description: "", finalUrl: normalised };
        }

        send({ type: "meta", title: siteData.title, description: siteData.description, finalUrl: siteData.finalUrl });
        send({ type: "status", message: "RUNNING AI ANALYSIS ENGINE…" });

        // Step 2: Stream AI analysis
        let buffer = "";
        await routedStream(
          {
            system: SYSTEM_PROMPT,
            messages: [{
              role: "user",
              content: buildPrompt(normalised, siteData.html, siteData.title, siteData.description),
            }],
            maxTokens: 1200,
          },
          (chunk: string) => {
            buffer += chunk;
            send({ type: "chunk", text: chunk });
          },
          (info: { model: string; provider: string; inputTokens: number; outputTokens: number }) => {
            // Try to parse the accumulated JSON
            try {
              const jsonStart = buffer.indexOf("{");
              const jsonEnd   = buffer.lastIndexOf("}");
              if (jsonStart !== -1 && jsonEnd !== -1) {
                const parsed = JSON.parse(buffer.slice(jsonStart, jsonEnd + 1));
                send({ type: "result", data: parsed, ...info });
              } else {
                send({ type: "done", ...info });
              }
            } catch {
              send({ type: "done", ...info });
            }
            controller.close();
          }
        );
      } catch (err) {
        send({ type: "error", message: String(err) });
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
