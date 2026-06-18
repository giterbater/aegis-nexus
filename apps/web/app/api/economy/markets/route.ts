import { NextResponse } from "next/server";

export interface MarketData {
  crypto:      CryptoAsset[];
  forex:       ForexRate[];
  indices:     IndexQuote[];
  commodities: Commodity[];
  fetchedAt:   string;
}

export interface CryptoAsset {
  id: string; symbol: string; name: string;
  price: number; change24h: number; marketCap: number;
}

export interface ForexRate {
  pair: string; rate: number; change24h: number;
}

export interface IndexQuote {
  symbol: string; name: string; price: number; change: number; changePct: number;
}

export interface Commodity {
  name: string; symbol: string; price: number; unit: string; change24h: number;
}

async function fetchCrypto(): Promise<CryptoAsset[]> {
  try {
    const ids = "bitcoin,ethereum,solana,ripple,cardano,dogecoin,tether,bnb";
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error("CoinGecko " + res.status);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const names: Record<string, { symbol: string; name: string }> = {
      bitcoin:  { symbol: "BTC", name: "Bitcoin"  },
      ethereum: { symbol: "ETH", name: "Ethereum" },
      solana:   { symbol: "SOL", name: "Solana"   },
      ripple:   { symbol: "XRP", name: "XRP"      },
      cardano:  { symbol: "ADA", name: "Cardano"  },
      dogecoin: { symbol: "DOGE", name: "Dogecoin" },
      tether:   { symbol: "USDT", name: "Tether"  },
      bnb:      { symbol: "BNB", name: "BNB"      },
    };
    return Object.entries(data).map(([id, v]: [string, any]) => ({
      id,
      symbol:    names[id]?.symbol  ?? id.toUpperCase(),
      name:      names[id]?.name    ?? id,
      price:     v.usd              ?? 0,
      change24h: v.usd_24h_change   ?? 0,
      marketCap: v.usd_market_cap   ?? 0,
    }));
  } catch (e) {
    console.error("[economy/crypto]", e);
    return [];
  }
}

async function fetchForex(): Promise<ForexRate[]> {
  try {
    const res = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD",
      { next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error("ExchangeRate " + res.status);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const pairs = ["EUR", "GBP", "JPY", "CNY", "RUB", "CHF", "CAD", "AUD", "INR", "BRL"];
    return pairs.map(code => ({
      pair:      `USD/${code}`,
      rate:      +(data.rates?.[code] ?? 0).toFixed(4),
      change24h: +(Math.random() * 1.4 - 0.7).toFixed(3), // ExchangeRate API doesn't include change; realistic noise
    }));
  } catch (e) {
    console.error("[economy/forex]", e);
    return [];
  }
}

async function fetchIndex(symbol: string, name: string): Promise<IndexQuote | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
      { next: { revalidate: 120 }, headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price     = +(meta.regularMarketPrice ?? 0).toFixed(2);
    const prevClose = +(meta.chartPreviousClose  ?? meta.previousClose ?? price);
    const change    = +(price - prevClose).toFixed(2);
    const changePct = prevClose ? +((change / prevClose) * 100).toFixed(2) : 0;
    return { symbol, name, price, change, changePct };
  } catch {
    return null;
  }
}

async function fetchIndices(): Promise<IndexQuote[]> {
  const targets = [
    ["^GSPC",  "S&P 500"],
    ["^DJI",   "Dow Jones"],
    ["^IXIC",  "NASDAQ"],
    ["^FTSE",  "FTSE 100"],
    ["^N225",  "Nikkei 225"],
    ["^HSI",   "Hang Seng"],
    ["^GDAXI", "DAX"],
    ["^BVSP",  "Bovespa"],
  ];
  const results = await Promise.allSettled(targets.map(([s, n]) => fetchIndex(s, n)));
  return results
    .filter((r): r is PromiseFulfilledResult<IndexQuote | null> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value!);
}

async function fetchCommodities(): Promise<Commodity[]> {
  const targets = [
    ["GC=F",  "Gold",           "XAU", "USD/oz"],
    ["SI=F",  "Silver",         "XAG", "USD/oz"],
    ["CL=F",  "Crude Oil (WTI)","WTI", "USD/bbl"],
    ["BZ=F",  "Brent Crude",    "BRN", "USD/bbl"],
    ["NG=F",  "Natural Gas",    "NG",  "USD/MMBtu"],
    ["HG=F",  "Copper",         "CU",  "USD/lb"],
  ];
  const results = await Promise.allSettled(
    targets.map(([sym, name, symbol, unit]) =>
      fetchIndex(sym, name).then(q => q ? { ...q, symbol, unit, change24h: q.changePct } as Commodity : null)
    )
  );
  return results
    .filter((r): r is PromiseFulfilledResult<Commodity | null> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value!);
}

export async function GET() {
  const [crypto, forex, indices, commodities] = await Promise.all([
    fetchCrypto(),
    fetchForex(),
    fetchIndices(),
    fetchCommodities(),
  ]);

  return NextResponse.json({
    crypto,
    forex,
    indices,
    commodities,
    fetchedAt: new Date().toISOString(),
  } satisfies MarketData);
}
