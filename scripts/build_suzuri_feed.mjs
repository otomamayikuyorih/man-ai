// scripts/build_suzuri_feed.mjs
import fs from "node:fs/promises";

const SUZURI_TOKEN = process.env.SUZURI_TOKEN;   // GitHub Secrets に入れる
const SUZURI_USER  = process.env.SUZURI_USER;    // 例: "YugenKozo"

if (!SUZURI_TOKEN) throw new Error("Missing env: SUZURI_TOKEN");
if (!SUZURI_USER)  throw new Error("Missing env: SUZURI_USER");

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SUZURI_TOKEN}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SUZURI API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function pickThumb(product) {
  // product.sampleImageUrl 等、返ってくるキーはAPIレスポンスに依存
  // まずは "imageUrl" 系があれば拾う。なければ空。
  return (
    product?.sampleImageUrl ||
    product?.imageUrl ||
    product?.images?.[0]?.url ||
    ""
  );
}

async function main() {
  // userName で絞って新しい順に返る想定（必要なら後でsort追加）
  const url = new URL("https://suzuri.jp/api/v1/products");
  url.searchParams.set("userName", SUZURI_USER);
  url.searchParams.set("limit", "20");
  url.searchParams.set("offset", "0");

  const json = await fetchJson(url.toString());
  const products = json.products || [];

  // createdAt / publishedAt があれば、それをdateにする
  const items = products.map((p) => ({
    title: p.title || p.name || "",
    link: p?.url || (p.id ? `https://suzuri.jp/${SUZURI_USER}/products/${p.id}` : `https://suzuri.jp/${SUZURI_USER}`),
    date: p.createdAt || p.publishedAt || "",
    thumb: pickThumb(p),
  }));

  // feed.json を読み、feeds.suzuri を差し替え
  const path = "data/feed.json";
  const data = JSON.parse(await fs.readFile(path, "utf-8"));
  data.feeds = data.feeds || {};
  data.feeds.suzuri = items;

  await fs.writeFile(path, JSON.stringify(data, null, 2), "utf-8");
  console.log(`OK: wrote feeds.suzuri (${items.length})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
