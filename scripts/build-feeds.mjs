// scripts/build-feeds.mjs
import fs from "node:fs";
import path from "node:path";

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "ALL-MAN-Bot" } });
  if (!res.ok) throw new Error(`fetch failed ${res.status} ${url}`);
  return await res.text();
}

// note RSS: <item> をざっくりパース（壊れにくい最低限）
function pickItemsFromRss(xml, limit = 10) {
  const items = [];
  const blocks = xml.split("<item>").slice(1);
  for (const b of blocks) {
    if (items.length >= limit) break;

    const title = (
      b.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
      b.match(/<title>(.*?)<\/title>/)?.[1] ??
      ""
    ).trim();

    const link = (b.match(/<link>(.*?)<\/link>/)?.[1] ?? "").trim();
    const pubDate = (b.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "").trim();

    // noteのサムネ: media:thumbnail url="..." があれば拾う（無ければ空）
    const thumb = (
      b.match(/<media:thumbnail[^>]*url="(.*?)"/)?.[1] ??
      ""
    ).trim();

    // description からテキストを抜きたい場合はここで抜けるが、
    // 今は app.js が title だけでもOKなので最小構成にしている
    if (link) items.push({ title, link, date: pubDate, thumb });
  }
  return items;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function main() {
  // note RSS（安定）
  const noteRssUrl = "https://note.com/biz_organized/rss";

  // YouTube Atom feed（channel_id 固定：env不要）
  const ytFeedUrl =
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCjxf5PsgMyF_t1Az_6duZfg";

  const [noteXml, ytXml] = await Promise.all([
    fetchText(noteRssUrl),
    fetchText(ytFeedUrl),
  ]);

  // note
  const noteItems = pickItemsFromRss(noteXml, 10);

  // YouTube Atom: <entry> をざっくりパース
  const yt = [];
  const entries = ytXml.split("<entry>").slice(1);
  for (const e of entries) {
    if (yt.length >= 8) break;

    const title = (e.match(/<title>(.*?)<\/title>/)?.[1] ?? "").trim();
    const link = (e.match(/<link[^>]*rel="alternate"[^>]*href="(.*?)"/)?.[1] ?? "").trim();
    const published = (e.match(/<published>(.*?)<\/published>/)?.[1] ?? "").trim();
    const thumb = (e.match(/<media:thumbnail[^>]*url="(.*?)"/)?.[1] ?? "").trim();

    if (link) yt.push({ title, link, date: published, thumb });
  }

  // app.js が ./data/feed.json を読むので、ここは feed.json に統一
  const out = {
    generated_at: Math.floor(Date.now() / 1000),
    feeds: { note: noteItems, youtube: yt },
  };

  ensureDir(path.join(process.cwd(), "data"));
  fs.writeFileSync(
    path.join("data", "feed.json"),
    JSON.stringify(out, null, 2),
    "utf-8"
  );

  console.log("wrote data/feed.json");
  console.log(`note: ${noteItems.length}, youtube: ${yt.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
