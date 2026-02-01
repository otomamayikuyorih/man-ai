import fs from "node:fs";
import path from "node:path";

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "ALL-MAN-Bot" } });
  if (!res.ok) throw new Error(`fetch failed ${res.status} ${url}`);
  return await res.text();
}

// ざっくりRSSから title/link/pubDate を抜く（壊れにくい最低限）
function pickItemsFromRss(xml, limit = 8) {
  const items = [];
  const blocks = xml.split("<item>").slice(1);
  for (const b of blocks) {
    if (items.length >= limit) break;
    const title = (b.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      ?? b.match(/<title>(.*?)<\/title>/)?.[1]
      ?? "").trim();
    const link = (b.match(/<link>(.*?)<\/link>/)?.[1] ?? "").trim();
    const pubDate = (b.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "").trim();
    if (link) items.push({ title, link, date: pubDate });
  }
  return items;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function main() {
  // note RSS（noteは /rss が安定）
  const noteRssUrl = "https://note.com/biz_organized/rss";
  // YouTube RSS（@ハンドルは不安定なので「channel_id」を使うのが本当は堅い）
  // まずはハンドルで試す（ダメなら次のステップでchannel_id方式に切替）
  const ytRssUrl = "https://www.youtube.com/feeds/videos.xml?channel_id=";

  // TODO: ここに channel_id を入れる（必須）
  const YT_CHANNEL_ID = process.env.YT_CHANNEL_ID;
  if (!YT_CHANNEL_ID) {
    throw new Error("YT_CHANNEL_ID is missing. Set GitHub Actions secret or env.");
  }

  const [noteXml, ytXml] = await Promise.all([
    fetchText(noteRssUrl),
    fetchText(ytRssUrl + YT_CHANNEL_ID)
  ]);

  const noteItems = pickItemsFromRss(noteXml, 10);

  // YouTubeは <entry> 形式なので別処理
  const yt = [];
  const entries = ytXml.split("<entry>").slice(1);
  for (const e of entries) {
    if (yt.length >= 8) break;
    const title = (e.match(/<title>(.*?)<\/title>/)?.[1] ?? "").trim();
    const link = (e.match(/<link rel="alternate" href="(.*?)"/)?.[1] ?? "").trim();
    const published = (e.match(/<published>(.*?)<\/published>/)?.[1] ?? "").trim();
    // サムネ（media:thumbnail）
    const thumb = (e.match(/<media:thumbnail url="(.*?)"/)?.[1] ?? "").trim();
    if (link) yt.push({ title, link, date: published, thumb });
  }

  const out = {
    generated_at: Math.floor(Date.now() / 1000),
    feeds: { note: noteItems, youtube: yt }
  };

  ensureDir(path.join(process.cwd(), "data"));
  fs.writeFileSync(path.join("data", "feeds.json"), JSON.stringify(out, null, 2), "utf-8");
  console.log("wrote data/feeds.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
