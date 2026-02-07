function toEpoch(s) {
  if (!s) return 0;
  // note: pubDate (RFC822), YouTube: ISO
  const t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

function labelOf(kind) {
  if (kind === "note") return "note";
  if (kind === "youtube") return "YouTube";
  return kind;
}

async function loadFeeds() {
  const res = await fetch(`./data/feed.json?v=${Date.now()}`, { cache: "no-store" });
  const data = await res.json();

  const genAt = new Date((data.generated_at || 0) * 1000);
  document.getElementById("genAt").textContent =
    `generated: ${isNaN(genAt) ? "-" : genAt.toLocaleString("ja-JP")}`;

  // ---- existing note list ----
  function toEpoch(s) {
  if (!s) return 0;
  const t = Date.parse(s); // RFC822 / ISO 両対応
  return isNaN(t) ? 0 : t;
}

function fmtDate(s) {
  const t = toEpoch(s);
  if (!t) return "";
  return new Date(t).toLocaleString("ja-JP");
}

function esc(s) {
  return (s ?? "").toString();
}

function joinCategories(cats) {
  if (!Array.isArray(cats) || cats.length === 0) return "";
  // 重複除去
  const uniq = [...new Set(cats.map(c => (c || "").trim()).filter(Boolean))];
  return uniq.join(" / ");
}

function makeNoteItem(item) {
  const wrap = document.createElement("li");
  wrap.className = "card note";

  // thumbnail
  if (item.thumb) {
    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = item.thumb;
    img.alt = item.title || "note";
    wrap.appendChild(img);
  }

  const body = document.createElement("div");
  body.className = "body";

  // title
  const titleA = document.createElement("a");
  titleA.className = "title";
  titleA.href = item.link;
  titleA.target = "_blank";
  titleA.rel = "noopener";
  titleA.textContent = item.title || item.link;
  body.appendChild(titleA);

  // meta line
  const meta = document.createElement("div");
  meta.className = "meta";

  const date = fmtDate(item.date);
  const author = item.author ? `by ${item.author}` : "";
  const cats = joinCategories(item.categories);

  // date / author / categories を “あるものだけ” 出す
  const parts = [date, author, cats].filter(Boolean);
  meta.textContent = parts.join("  |  ");
  if (parts.length) body.appendChild(meta);

  // description (text)
  const desc = (item.description_text || "").trim();
  if (desc) {
    const p = document.createElement("p");
    p.className = "desc";
    p.textContent = desc.length > 160 ? desc.slice(0, 160) + "…" : desc;
    body.appendChild(p);
  }

  // extra links (optional)
  // guid や enclosure があれば表示したい場合
  if (item.enclosures && item.enclosures.length) {
    const ex = document.createElement("div");
    ex.className = "extra";
    ex.textContent = `enclosure: ${item.enclosures.length}`;
    body.appendChild(ex);
  }

  wrap.appendChild(body);
  return wrap;
}

function makeYtItem(v) {
  const a = document.createElement("a");
  a.className = "yt card";
  a.href = v.link;
  a.target = "_blank";
  a.rel = "noopener";

  if (v.thumb) {
    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = v.thumb;
    img.alt = v.title || "YouTube";
    a.appendChild(img);
  }

  const body = document.createElement("div");
  body.className = "body";

  const t = document.createElement("div");
  t.className = "title";
  t.textContent = v.title || v.link;
  body.appendChild(t);

  const d = fmtDate(v.date);
  if (d) {
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = d;
    body.appendChild(meta);
  }

  a.appendChild(body);
  return a;
}

async function loadFeeds() {
  const res = await fetch(`./data/feed.json?v=${Date.now()}`, { cache: "no-store" });
  const data = await res.json();

  const genAt = new Date((data.generated_at || 0) * 1000);
  document.getElementById("genAt").textContent =
    `generated: ${isNaN(genAt) ? "-" : genAt.toLocaleString("ja-JP")}`;

  // ===== note =====
  const noteList = document.getElementById("noteList");
  noteList.innerHTML = "";

  const notes = (data.feeds.note || [])
    .slice()
    .sort((a, b) => toEpoch(b.date) - toEpoch(a.date))
    .slice(0, 6); // 表示件数

  notes.forEach(item => noteList.appendChild(makeNoteItem(item)));

  // ===== youtube =====
  const yt = document.getElementById("ytList");
  yt.innerHTML = "";

  const yts = (data.feeds.youtube || [])
    .slice()
    .sort((a, b) => toEpoch(b.date) - toEpoch(a.date))
    .slice(0, 6);

  yts.forEach(v => yt.appendChild(makeYtItem(v)));
}

loadFeeds().catch(console.error);
