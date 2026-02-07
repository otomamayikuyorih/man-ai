function toEpoch(s) {
  if (!s) return 0;
  const t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

function fmtDate(s) {
  const t = toEpoch(s);
  if (!t) return "";
  return new Date(t).toLocaleString("ja-JP");
}

function stripTags(html) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function joinCategories(cats) {
  if (!Array.isArray(cats) || cats.length === 0) return "";
  const uniq = [...new Set(cats.map(c => (c || "").trim()).filter(Boolean))];
  return uniq.join(" / ");
}

function makeNoteItem(item) {
  const li = document.createElement("li");
  li.className = "card note";

  if (item.thumb) {
    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = item.thumb;
    img.alt = item.title || "note";
    li.appendChild(img);
  }

  const body = document.createElement("div");
  body.className = "body";

  const a = document.createElement("a");
  a.className = "title";
  a.href = item.link;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = item.title || item.link;
  body.appendChild(a);

  const meta = [];
  const d = fmtDate(item.date);
  if (d) meta.push(d);
  if (item.author) meta.push(`by ${item.author}`);
  const cats = joinCategories(item.categories);
  if (cats) meta.push(cats);

  if (meta.length) {
    const m = document.createElement("div");
    m.className = "meta";
    m.textContent = meta.join("  |  ");
    body.appendChild(m);
  }

  const desc =
    (item.description_text && item.description_text.trim()) ||
    stripTags(item.description_html || "");
  if (desc) {
    const p = document.createElement("p");
    p.className = "desc";
    p.textContent = desc.length > 160 ? desc.slice(0, 160) + "…" : desc;
    body.appendChild(p);
  }

  li.appendChild(body);
  return li;
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
    const m = document.createElement("div");
    m.className = "meta";
    m.textContent = d;
    body.appendChild(m);
  }

  a.appendChild(body);
  return a;
}

async function loadFeeds() {
  console.log("[app] loadFeeds start");

  const url = `./data/feed.json?v=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  console.log("[app] fetch", url, "status:", res.status);

  if (!res.ok) throw new Error(`feed.json fetch failed: ${res.status}`);

  const data = await res.json();
  console.log("[app] parsed json keys:", Object.keys(data));
  console.log("[app] note len:", data?.feeds?.note?.length, "yt len:", data?.feeds?.youtube?.length);

  // generated_at
  const genAt = new Date((data.generated_at || 0) * 1000);
  const genEl = document.getElementById("genAt");
  if (genEl) {
    genEl.textContent = `generated: ${isNaN(genAt) ? "-" : genAt.toLocaleString("ja-JP")}`;
  }

  // note
  const noteList = document.getElementById("noteList");
  if (!noteList) throw new Error("missing #noteList");

  noteList.innerHTML = "";
  const notes = (data.feeds?.note || [])
    .slice()
    .sort((a, b) => toEpoch(b.date) - toEpoch(a.date))
    .slice(0, 6);

  notes.forEach(item => noteList.appendChild(makeNoteItem(item)));

  // youtube
  const ytList = document.getElementById("ytList");
  if (!ytList) throw new Error("missing #ytList");

  ytList.innerHTML = "";
  const yts = (data.feeds?.youtube || [])
    .slice()
    .sort((a, b) => toEpoch(b.date) - toEpoch(a.date))
    .slice(0, 6);

  yts.forEach(v => ytList.appendChild(makeYtItem(v)));

  console.log("[app] render done");
}

loadFeeds().catch((e) => {
  console.error("[app] ERROR:", e);

  // 画面にも出す（真っ白が一番つらいので）
  const top = document.querySelector("#top .brandText");
  if (top) {
    const p = document.createElement("p");
    p.style.marginTop = "8px";
    p.style.color = "crimson";
    p.textContent = `feed load error: ${e?.message || e}`;
    top.appendChild(p);
  }
});
