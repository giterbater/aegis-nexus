import { NextResponse } from "next/server";

export interface ScannedThreat {
  id:         string;
  headline:   string;
  source:     string;
  url:        string;
  seendate:   string;
  country:    string;
  threatScore: number; // 0-100
  category:   string;
  keywords:   string[];
}

// Keyword → threat category + score boost mapping
const THREAT_KEYWORDS: { pattern: RegExp; category: string; score: number }[] = [
  { pattern: /nuclear|missile|warhead|icbm|plutonium|uranium/i,         category: "NUCLEAR",      score: 90 },
  { pattern: /cyberattack|ransomware|malware|hack|breach|zero.?day/i,   category: "CYBER",        score: 75 },
  { pattern: /airstrike|bombing|explosion|military|troops|invasion/i,   category: "MILITARY",     score: 80 },
  { pattern: /terrorism|attack|isis|al.?qaeda|taliban|extremist/i,      category: "MILITARY",     score: 85 },
  { pattern: /sanction|embargo|tariff|trade.war|economic.crisis/i,      category: "ECONOMIC",     score: 55 },
  { pattern: /earthquake|tsunami|hurricane|flood|disaster|wildfire/i,   category: "NATURAL",      score: 60 },
  { pattern: /pandemic|outbreak|virus|epidemic|disease|WHO/i,           category: "HEALTH",       score: 65 },
  { pattern: /coup|protest|riot|uprising|revolution|overthrow/i,        category: "GEOPOLITICAL", score: 70 },
  { pattern: /spy|intelligence|espionage|defect|surveillance/i,         category: "INTELLIGENCE", score: 65 },
  { pattern: /refugee|humanitarian|famine|civilian|displacement/i,      category: "HUMANITARIAN", score: 50 },
];

function scoreArticle(title: string): { score: number; category: string; keywords: string[] } {
  let maxScore = 0;
  let category = "GEOPOLITICAL";
  const keywords: string[] = [];

  for (const { pattern, category: cat, score } of THREAT_KEYWORDS) {
    const match = title.match(pattern);
    if (match) {
      keywords.push(match[0]);
      if (score > maxScore) { maxScore = score; category = cat; }
    }
  }

  // Base score for any international news
  if (maxScore === 0) maxScore = 20 + Math.floor(Math.random() * 25);

  return { score: maxScore, category, keywords };
}

export async function GET() {
  try {
    // Pull latest global articles from GDELT — broad query for high-impact news
    const queries = [
      "war OR conflict OR attack OR military",
      "nuclear OR missile OR weapon",
      "cyber OR hack OR breach",
      "sanctions OR crisis OR coup",
    ];
    const q = queries[Math.floor(Math.random() * queries.length)];

    const gdeltUrl =
      `https://api.gdeltproject.org/api/v2/doc/doc` +
      `?query=${encodeURIComponent(q)}` +
      `&mode=artlist&maxrecords=15&sort=DateDesc&format=json`;

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(gdeltUrl, {
      signal: controller.signal,
      next: { revalidate: 60 },
    }).finally(() => clearTimeout(tid));

    if (!res.ok) throw new Error("GDELT " + res.status);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const articles: any[] = data?.articles ?? [];

    const threats: ScannedThreat[] = articles
      .map((a, i) => {
        const { score, category, keywords } = scoreArticle(a.title ?? "");
        return {
          id:          `scan-${Date.now()}-${i}`,
          headline:    a.title    ?? "Untitled",
          source:      a.domain   ?? "Unknown",
          url:         a.url      ?? "#",
          seendate:    a.seendate ?? "",
          country:     a.sourcecountry ?? "Unknown",
          threatScore: score,
          category,
          keywords,
        };
      })
      .filter(t => t.threatScore >= 30)
      .sort((a, b) => b.threatScore - a.threatScore)
      .slice(0, 10);

    return NextResponse.json({ threats, scannedAt: new Date().toISOString(), query: q });
  } catch (err) {
    console.error("[threat/scan]", err);
    return NextResponse.json({ threats: [], scannedAt: new Date().toISOString() });
  }
}
