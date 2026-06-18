import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface TickerItem {
  headline: string;
  source:   string;
  url:      string;
  tone:     number;
  country:  string;
}

const TICKER_QUERIES = [
  "conflict war military",
  "nuclear missile weapons",
  "sanctions trade economic",
  "protest political crisis",
  "cyber attack hacking",
  "natural disaster earthquake flood",
  "election government coup",
  "intelligence espionage",
];

export async function GET() {
  try {
    // Pick a few random queries to get diverse headlines
    const selected = TICKER_QUERIES.sort(() => Math.random() - 0.5).slice(0, 3);

    const results = await Promise.allSettled(
      selected.map(async (q) => {
        const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&maxrecords=10&format=json&timespan=6h`;
        const res = await fetch(url, {
          next: { revalidate: 900 }, // 15 min cache
        });
        if (!res.ok) return [];
        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (data.articles ?? []).map((a: any): TickerItem => ({
          headline: a.title ?? "Intelligence Update",
          source:   a.domain ?? "GDELT",
          url:      a.url ?? "#",
          tone:     a.tone ?? 0,
          country:  a.sourcecountry ?? "INTL",
        }));
      })
    );

    const items: TickerItem[] = results
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .filter((a) => a.headline.length > 15 && a.headline.length < 160)
      // Deduplicate by headline prefix
      .filter((item, idx, arr) =>
        arr.findIndex((x) => x.headline.slice(0, 30) === item.headline.slice(0, 30)) === idx
      )
      .slice(0, 30);

    // Fallback headlines if GDELT returns nothing
    if (items.length === 0) {
      const fallback: TickerItem[] = [
        { headline: "GLOBAL THREAT ASSESSMENT: ELEVATED ACROSS EASTERN EUROPE AND PACIFIC THEATER", source: "AEGIS-AUTO", url: "#", tone: -3, country: "INTL" },
        { headline: "CYBER OPERATIONS DETECTED — CRITICAL INFRASTRUCTURE TARGETED IN MULTIPLE REGIONS", source: "SIGINT", url: "#", tone: -5, country: "INTL" },
        { headline: "DIPLOMATIC CHANNELS STRAINED AS MILITARY BUILDUP CONTINUES ON CONTESTED BORDER", source: "HUMINT", url: "#", tone: -2, country: "INTL" },
        { headline: "ECONOMIC INDICATORS SHOW MARKET VOLATILITY LINKED TO GEOPOLITICAL RISK FACTORS", source: "FININT", url: "#", tone: -1, country: "INTL" },
        { headline: "SATELLITE IMAGERY CONFIRMS NEW CONSTRUCTION AT PREVIOUSLY IDENTIFIED FACILITY", source: "IMINT", url: "#", tone: -4, country: "INTL" },
        { headline: "AUTONOMOUS SCAN COMPLETE — 7 NEW THREAT VECTORS IDENTIFIED AND LOGGED", source: "AEGIS-AI", url: "#", tone: -3, country: "INTL" },
      ];
      return NextResponse.json({ items: fallback });
    }

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
