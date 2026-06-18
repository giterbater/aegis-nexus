import { NextResponse } from "next/server";

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  published: string;
}

// Maps ISO-2 → GDELT sourcecountry display name
const COUNTRY_NAME: Record<string, string> = {
  US:"United States", GB:"United Kingdom", DE:"Germany", FR:"France",
  JP:"Japan", CN:"China", IN:"India", RU:"Russia", BR:"Brazil",
  CA:"Canada", AU:"Australia", KR:"South Korea", MX:"Mexico",
  IT:"Italy", ES:"Spain", SA:"Saudi Arabia", TR:"Turkey",
  ID:"Indonesia", NL:"Netherlands", SE:"Sweden", NO:"Norway",
  PL:"Poland", UA:"Ukraine", ZA:"South Africa", NG:"Nigeria",
  EG:"Egypt", PK:"Pakistan", IR:"Iran", IL:"Israel",
  TH:"Thailand", MY:"Malaysia", PH:"Philippines", VN:"Vietnam",
  AR:"Argentina", CL:"Chile", CO:"Colombia", PE:"Peru",
  CH:"Switzerland", AT:"Austria", BE:"Belgium", GR:"Greece",
  PT:"Portugal", CZ:"Czech Republic", HU:"Hungary", RO:"Romania",
  FI:"Finland", DK:"Denmark", NZ:"New Zealand", SG:"Singapore",
  AE:"United Arab Emirates", QA:"Qatar", IQ:"Iraq", SY:"Syria",
  LB:"Lebanon", JO:"Jordan", KE:"Kenya", ET:"Ethiopia",
  TZ:"Tanzania", GH:"Ghana", UG:"Uganda", MA:"Morocco",
  TN:"Tunisia", DZ:"Algeria", LY:"Libya", SD:"Sudan",
  BD:"Bangladesh", LK:"Sri Lanka", MM:"Myanmar", KH:"Cambodia",
  LA:"Laos", NP:"Nepal", AF:"Afghanistan", AZ:"Azerbaijan",
  GE:"Georgia", AM:"Armenia", BY:"Belarus", RS:"Serbia",
  HR:"Croatia", SK:"Slovakia", SI:"Slovenia", BG:"Bulgaria",
  MK:"North Macedonia", BA:"Bosnia",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cca2 = (searchParams.get("country") ?? "").toUpperCase();
  const name  = searchParams.get("name") ?? "";

  if (!cca2 && !name) {
    return NextResponse.json({ error: "country or name required" }, { status: 400 });
  }

  const displayName = COUNTRY_NAME[cca2] ?? name;

  // Use keyword search which is less strict and better cached by GDELT
  const searchTerm = displayName || cca2;
  const gdeltUrl =
    `https://api.gdeltproject.org/api/v2/doc/doc` +
    `?query=${encodeURIComponent(searchTerm)}` +
    `&mode=artlist` +
    `&maxrecords=8` +
    `&sort=DateDesc` +
    `&format=json`;

  try {
    // Simple fetch — Next.js handles caching via revalidate
    const res = await fetch(gdeltUrl, { next: { revalidate: 1800 } });

    if (res.status === 429) {
      // Rate limited — return empty; client shows graceful fallback
      return NextResponse.json({ articles: [], rateLimited: true, fetchedAt: new Date().toISOString() });
    }

    if (!res.ok) throw new Error(`GDELT ${res.status}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const articles: NewsArticle[] = (data?.articles ?? []).map((a: any) => ({
      title:     a.title    ?? "Untitled",
      url:       a.url      ?? "#",
      source:    a.domain   ?? a.sourcecountry ?? "Unknown",
      published: a.seendate ?? "",
    }));

    return NextResponse.json({ articles, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error(`[world/news] ${searchTerm}:`, err);
    return NextResponse.json({ articles: [], fetchedAt: new Date().toISOString() });
  }
}
