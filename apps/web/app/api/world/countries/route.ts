import { NextResponse } from "next/server";

export const revalidate = 3600; // cache 1 hour

export interface CountryData {
  cca2: string;
  name: string;
  capital: string;
  region: string;
  subregion: string;
  population: number;
  flag: string;       // emoji flag
  flagUrl: string;    // PNG URL
  lat: number;
  lng: number;
  area: number;
  gdpPerCapita?: number;
}

export async function GET() {
  try {
    const res = await fetch(
      "https://restcountries.com/v3.1/all?fields=name,cca2,capital,region,subregion,population,flags,latlng,area,flag",
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) throw new Error(`REST Countries API ${res.status}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = await res.json();

    const countries: CountryData[] = raw
      .map((c) => ({
        cca2:       c.cca2 ?? "",
        name:       c.name?.common ?? "Unknown",
        capital:    Array.isArray(c.capital) ? c.capital[0] ?? "—" : "—",
        region:     c.region ?? "Unknown",
        subregion:  c.subregion ?? "",
        population: c.population ?? 0,
        flag:       c.flag ?? "",
        flagUrl:    c.flags?.png ?? c.flags?.svg ?? "",
        lat:        Array.isArray(c.latlng) ? c.latlng[0] ?? 0 : 0,
        lng:        Array.isArray(c.latlng) ? c.latlng[1] ?? 0 : 0,
        area:       c.area ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ countries, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[world/countries]", err);
    return NextResponse.json({ error: "Failed to fetch country data" }, { status: 502 });
  }
}
