#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MythicMobs 官方 Wiki 全站抓取 + 结构化解析
目标站点: https://wiki.mythiccraft.io/mythicmobs

输出:
  data/raw/<slug>.html          原始页面缓存(可断点续跑)
  data/mythicmobs-wiki.json     全站页面(含正文 markdown)
  data/schema.json              编辑器用的精简 schema(按 kind 归类)
  data/index.md                 人读的目录索引

用法:
  python tools/crawl_wiki.py --limit 5      # 试跑
  python tools/crawl_wiki.py                # 全量
"""
import argparse
import hashlib
import html as htmlmod
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "https://wiki.mythiccraft.io"
ROOT = "/mythicmobs"
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(HERE, "data", "raw")
OUT = os.path.join(HERE, "data")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MythicMobsStudio-WikiCrawler/1.0"
WORKERS = 8
MAX_PAGES = 2000


# ---------------------------------------------------------------- 抓取
def norm_url(u: str) -> str:
    """规范化: 去掉 fragment / 结尾斜杠 / 统一小写路径用于去重(保留原始大小写给 HTTP)"""
    p = urlsplit(u)
    path = re.sub(r"/+$", "", p.path) or "/"
    return urlunsplit((p.scheme, p.netloc, path, "", ""))


def cache_path(url: str) -> str:
    slug = norm_url(url).replace(BASE, "", 1).strip("/").replace("/", "__") or "root"
    slug = re.sub(r"[^A-Za-z0-9_.\-]", "_", slug)[:150]
    return os.path.join(RAW, slug + ".html")


def fetch(url: str, retries: int = 3) -> str | None:
    cp = cache_path(url)
    if os.path.exists(cp) and os.path.getsize(cp) > 1000:
        with open(cp, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    for i in range(retries):
        try:
            req = Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
            with urlopen(req, timeout=45) as r:
                data = r.read().decode("utf-8", errors="replace")
            if len(data) > 1000:
                os.makedirs(RAW, exist_ok=True)
                with open(cp, "w", encoding="utf-8") as f:
                    f.write(data)
                return data
        except Exception as e:  # noqa: BLE001
            if i == retries - 1:
                print(f"  !! FAIL {url}: {e}", flush=True)
                return None
            time.sleep(1.5 * (i + 1))
    return None


# ---------------------------------------------------------------- 解析
class ArticleParser(HTMLParser):
    """从 wiki 页面里抽出 article: 面包屑 / h1 / 正文块"""

    BLOCK_TAGS = {"h2", "h3", "p", "pre", "ul", "ol", "table", "blockquote", "div"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_article = False
        self.article_depth = 0
        self.breadcrumb: list[str] = []
        self.in_breadcrumbs = False
        self.title = ""
        self.updated = ""
        self.in_h1 = False
        self.in_content = False
        self.content_depth = 0

        # 正在构建的块
        self.blocks: list[dict] = []
        self.cur: dict | None = None
        self.buf: list[str] = []

        self.in_table = False
        self.table_rows: list[list[str]] = []
        self.row: list[str] | None = None
        self.cell: list[str] | None = None
        self.in_footer = False

    # -- helpers -------------------------------------------------
    def _open_block(self, tag, attrs):
        a = dict(attrs)
        self.cur = {"tag": tag, "id": a.get("id", ""), "text": "", "rows": [], "lang": "", "level": 0}
        self.buf = []

    def _close_block(self):
        if not self.cur:
            return
        txt = "".join(self.buf)
        txt = re.sub(r"[ \t]+", " ", txt)
        txt = re.sub(r"\n{3,}", "\n\n", txt).strip()
        b = self.cur
        b["text"] = txt
        if b["tag"] == "table":
            b["rows"] = self.table_rows
        # 丢弃空块
        if txt or b["rows"]:
            self.blocks.append(b)
        self.cur = None
        self.buf = []

    # -- events --------------------------------------------------
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = a.get("class", "")

        if tag == "article" and "wiki-article" in cls:
            self.in_article = True
            return

        if tag == "div" and "breadcrumbs" in cls:
            self.in_breadcrumbs = True
            return

        if tag == "h1" and a.get("id") == "page-top":
            self.in_h1 = True
            return

        if self.in_breadcrumbs and tag == "a":
            self.buf.append("")  # 占位, 文本由 data 填
            return

        if tag == "div" and "wiki-content" in cls and self.in_article:
            self.in_content = True
            # wiki-content 自身算一层, 这样内部 div 关闭时不会提前结束
            self.content_depth = 1
            return

        if not self.in_content:
            if tag == "footer" and "article-footer" in cls:
                self.in_footer = True
            return

        if tag == "div":
            self.content_depth += 1
            if "wiki-table-scroll" in cls:
                return
            if not self.cur:
                self._open_block("div", attrs)
            return
        # 注意: 上面统一 +1, 保证下面 </div> 的 -1 永远配平

        if tag in ("h1", "h2", "h3", "h4", "h5"):
            if self.cur:
                self._close_block()
            self._open_block(tag, attrs)
            self.cur["level"] = int(tag[1])
        elif tag in ("p", "blockquote"):
            if self.cur and self.cur["tag"] == tag:
                self.buf.append("\n\n")
            elif not self.cur:
                self._open_block(tag, attrs)
        elif tag == "pre":
            if self.cur:
                self._close_block()
            self._open_block("pre", attrs)
        elif tag in ("ul", "ol"):
            if not self.cur:
                self._open_block(tag, attrs)
        elif tag == "li":
            if self.cur:
                self.buf.append("\n- ")
        elif tag == "table":
            if self.cur:
                self._close_block()
            self.in_table = True
            self.table_rows = []
            self.row = None
            self._open_block("table", attrs)
        elif tag == "tr" and self.in_table:
            self.row = []
        elif tag in ("td", "th") and self.in_table:
            self.cell = []
        elif tag == "code":
            if self.cur and self.cur["tag"] == "pre":
                self.cur["lang"] = cls.replace("language-", "") if "language-" in cls else ""
        elif tag == "br":
            self.buf.append("\n")

    def handle_endtag(self, tag):
        if tag == "article":
            self.in_article = False
            return
        if tag == "div" and self.in_breadcrumbs:
            self.in_breadcrumbs = False
            return
        if tag == "h1" and self.in_h1:
            self.in_h1 = False
            return

        if not self.in_content:
            if tag == "footer":
                self.in_footer = False
            return

        if tag == "div":
            if self.content_depth > 0:
                self.content_depth -= 1
                if self.content_depth == 0:
                    if self.cur:
                        self._close_block()
                    self.in_content = False
            return

        if tag in ("h1", "h2", "h3", "h4", "h5") and self.cur and self.cur["tag"] == tag:
            self._close_block()
        elif tag in ("p", "blockquote") and self.cur and self.cur["tag"] == tag:
            self._close_block()
        elif tag == "pre" and self.cur and self.cur["tag"] == "pre":
            self._close_block()
        elif tag in ("ul", "ol") and self.cur and self.cur["tag"] == tag:
            self._close_block()
        elif tag == "table" and self.in_table:
            self.in_table = False
            self._close_block()
        elif tag == "tr" and self.in_table and self.row is not None:
            self.table_rows.append(self.row)
            self.row = None
        elif tag in ("td", "th") and self.cell is not None:
            txt = re.sub(r"\s+", " ", "".join(self.cell)).strip()
            if self.row is not None:
                self.row.append(txt)
            self.cell = None

    def handle_data(self, data):
        if self.in_breadcrumbs:
            t = data.strip()
            if t:
                self.breadcrumb.append(t)
            return
        if self.in_h1:
            self.title += data
            return
        if self.in_footer:
            m = re.search(r"Updated\s+([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})", data)
            if m:
                self.updated = m.group(1)
            return
        if self.cell is not None:
            self.cell.append(data)
            return
        if self.cur is not None:
            self.buf.append(data)


# ---------------------------------------------------------------- 结构化
KIND_BY_SEGMENT = {
    "mechanics": "mechanic",
    "conditions": "condition",
    "targeters": "targeter",
    "triggers": "trigger",
    "ai-goals": "ai-goal",
    "ai-targets": "ai-target",
}


def guess_kind(breadcrumb: list[str], url: str) -> str:
    low = [c.lower().replace(" ", "-") for c in breadcrumb]
    for seg in reversed(low):
        if seg in KIND_BY_SEGMENT:
            return KIND_BY_SEGMENT[seg]
    # 兜底: 看 URL
    m = re.search(r"/(Mechanics|conditions|Targeters|Triggers|ai-goals|ai-targets)/[^/]+$", url, re.I)
    if m:
        return KIND_BY_SEGMENT.get(m.group(1).lower(), "page")
    return "page"


def blocks_to_md(blocks: list[dict]) -> str:
    out = []
    for b in blocks:
        t = b["tag"]
        if t in ("h1", "h2", "h3", "h4", "h5"):
            if b["text"]:
                out.append(("#" * int(t[1])) + " " + b["text"])
        elif t == "p":
            if b["text"]:
                out.append(b["text"])
        elif t == "blockquote":
            if b["text"]:
                out.append("> " + b["text"].replace("\n", "\n> "))
        elif t in ("ul", "ol"):
            if b["text"].strip():
                out.append(b["text"].strip())
        elif t == "pre":
            if b["text"]:
                out.append("```" + (b["lang"] or "") + "\n" + b["text"] + "\n```")
        elif t == "table":
            rows = [r for r in b["rows"] if r]
            if rows:
                width = max(len(r) for r in rows)
                rows = [r + [""] * (width - len(r)) for r in rows]
                out.append("| " + " | ".join(rows[0]) + " |")
                out.append("|" + "---|" * width)
                for r in rows[1:]:
                    out.append("| " + " | ".join(r) + " |")
    return "\n\n".join(out).strip()


def parse_attr_table(rows: list[list[str]]) -> list[dict]:
    if not rows:
        return []
    header = [c.lower() for c in rows[0]]
    if "attribute" not in header[0]:
        return []
    idx = {name: header.index(name) for name in header if name}

    def get(row, key):
        i = idx.get(key)
        return row[i] if i is not None and i < len(row) else ""

    attrs = []
    for r in rows[1:]:
        name = get(r, "attribute").strip()
        if not name:
            continue
        aliases = [x.strip() for x in re.split(r"[,/]", get(r, "aliases")) if x.strip()]
        attrs.append(
            {
                "name": name,
                "aliases": aliases,
                "description": get(r, "description").strip(),
                "default": get(r, "default").strip(),
            }
        )
    return attrs


def split_aliases(blocks: list[dict]) -> list[str]:
    out, grab = [], False
    for b in blocks:
        if b["tag"] in HEADING_TAGS:
            grab = b["text"].strip().lower() in ("aliases", "alias")
            continue
        if grab and b["tag"] in ("ul", "ol"):
            for line in b["text"].split("\n"):
                line = re.sub(r"\s+", " ", line.strip().lstrip("-")).strip()
                if line and line not in out:
                    out.append(line)
    return out


def extract_inherits(blocks: list[dict]) -> str:
    """'This mechanic inherits every attribute of the Aura mechanic' → 'Aura'"""
    for b in blocks:
        if b["tag"] == "blockquote":
            m = re.search(r"inherits?\s+(?:every|all)?\s*attributes?\s+of\s+(?:the\s+)?([A-Za-z0-9_]+)",
                          b["text"], re.I)
            if m:
                return m.group(1)
    return ""


HEADING_TAGS = ("h1", "h2", "h3", "h4", "h5")
YAML_KEY_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")


def extract_fields(blocks: list[dict]) -> list[dict]:
    """Mobs/Options、Items/Options 这类页面用小标题当字段名, 抽成字段表"""
    fields: list[dict] = []
    cur = None
    for b in blocks:
        if b["tag"] in HEADING_TAGS:
            name = b["text"].strip()
            if b["tag"] in ("h3", "h4", "h5") and YAML_KEY_RE.match(name) and len(name) >= 2:
                cur = {"name": name, "description": "", "default": "", "examples": []}
                fields.append(cur)
            else:
                cur = None
            continue
        if cur is None:
            continue
        if b["tag"] in ("p", "blockquote") and b["text"].strip():
            if len(cur["description"]) < 600:
                cur["description"] = (cur["description"] + " " + b["text"].strip()).strip()
        elif b["tag"] == "pre" and len(cur["examples"]) < 3 and b["text"].strip():
            cur["examples"].append(b["text"].strip())
    for f in fields:
        f["description"] = re.sub(r"\s+", " ", f["description"]).strip()
        m = re.search(r"[Dd]efaults? to\s+`?([^`.,;)]+)`?", f["description"])
        if m:
            f["default"] = m.group(1).strip()
    return [f for f in fields if f["description"] or f["examples"]]


def parse_page(url: str, html_text: str) -> dict:
    p = ArticleParser()
    try:
        p.feed(html_text)
    except Exception as e:  # noqa: BLE001
        print(f"  !! parse error {url}: {e}", flush=True)

    blocks = p.blocks
    examples = [b["text"] for b in blocks if b["tag"] == "pre" and b["text"].strip()]
    """一页可能有**两张**属性表：Non-Inheritable Attributes 和 Inheritable Attributes。
       只取第一张会丢掉全部继承来的参数（Damage 就只剩 amount，ignoreArmor / damagecause 全丢），
       所以这里把所有属性表按顺序合并，后表里与前面同名的跳过，其余标记 inherited。"""
    attr_table = None
    seen_attr = set()
    for b in blocks:
        if b["tag"] != "table":
            continue
        a = parse_attr_table(b["rows"])
        if not a:
            continue
        if attr_table is None:
            attr_table = a
            seen_attr = {x["name"].lower() for x in a}
            continue
        for x in a:
            key = x["name"].lower()
            if key in seen_attr:
                continue
            seen_attr.add(key)
            x["inherited"] = True
            attr_table.append(x)

    # 正文第一段作为 description
    desc = ""
    for b in blocks:
        if b["tag"] in HEADING_TAGS:
            if b["text"].strip().lower() == "description":
                continue
            break
        if b["tag"] == "p" and b["text"].strip():
            desc = b["text"].strip()
            break

    kind = guess_kind(p.breadcrumb, url)
    crumbs = [c for c in p.breadcrumb if c not in ("/", "")]
    desc = re.sub(r"\s*\n\s*", " ", desc).strip()
    path = urlsplit(norm_url(url)).path
    return {
        "id": path.replace("/mythicmobs/", "").lower() or "root",
        "path": path,
        "url": norm_url(url),
        "title": htmlmod.unescape(p.title).strip(),
        "kind": kind,
        "breadcrumbs": crumbs,
        "updated": p.updated,
        "description": desc,
        "aliases": split_aliases(blocks),
        "inherits": extract_inherits(blocks),
        "attributes": attr_table or [],
        "fields": extract_fields(blocks),
        "examples": examples,
        "content_md": blocks_to_md(blocks),
    }


# ---------------------------------------------------------------- 主流程
def discover(seed_pages: list[str]) -> list[str]:
    """种子列表(首页导航 + 各索引页) → 待抓取 URL 集合"""
    urls = []
    for s in seed_pages:
        urls.append(s)
    return urls


def links_in(html_text: str) -> list[str]:
    out = []
    for m in re.finditer(r'href="(https://wiki\.mythiccraft\.io/mythicmobs[^"#?]*)"', html_text):
        u = m.group(1)
        if u.endswith(".js") or u.endswith(".css"):
            continue
        out.append(norm_url(u))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    os.makedirs(OUT, exist_ok=True)
    os.makedirs(RAW, exist_ok=True)

    # 1) 首页 → 导航全集
    home = fetch(BASE + ROOT)
    if not home:
        print("首页抓取失败, 退出")
        return 1

    seeds = [BASE + ROOT] + links_in(home)
    # 2) 参考索引页(连通组件子页)
    for extra in ("/mythicmobs/mechanics", "/mythicmobs/conditions", "/mythicmobs/targeters",
                  "/mythicmobs/ai-goals", "/mythicmobs/ai-targets",
                  "/mythicmobs/Skills/Mechanics", "/mythicmobs/Skills/conditions",
                  "/mythicmobs/Skills/Targeters", "/mythicmobs/Skills/Triggers"):
        seeds.append(BASE + extra)

    seen = set()
    queue = []
    for s in seeds:
        n = norm_url(s)
        if n not in seen:
            seen.add(n)
            queue.append(s)

    print(f"种子页: {len(queue)}")

    # 3) 先抓索引页, 再从里面发现子页
    pages: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {ex.submit(fetch, u): u for u in queue}
        for f in as_completed(futs):
            u = futs[f]
            html_text = f.result()
            if html_text:
                pages[norm_url(u)] = html_text
    print(f"索引页完成: {len(pages)}")

    sub = []
    for u, h in list(pages.items()):
        for link in links_in(h):
            if link not in seen:
                seen.add(link)
                sub.append(link)
    print(f"发现子页: {len(sub)}  (去重后总链接 {len(seen)})")

    if args.limit:
        sub = sub[: args.limit]

    # 4) 抓子页
    done = 0
    fail = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {ex.submit(fetch, u): u for u in sub}
        for f in as_completed(futs):
            u = futs[f]
            html_text = f.result()
            done += 1
            if html_text:
                pages[norm_url(u)] = html_text
            else:
                fail += 1
            if done % 50 == 0:
                print(f"  进度 {done}/{len(sub)}  (失败 {fail})", flush=True)
    print(f"子页完成: {done}, 失败 {fail}")

    # 5) 解析
    records = []
    for u, h in pages.items():
        if u.rstrip("/") == BASE + ROOT:
            continue
        rec = parse_page(u, h)
        if rec["title"]:
            records.append(rec)
    records.sort(key=lambda r: (r["kind"], r["title"].lower()))

    # 6) 输出
    counts = {}
    for r in records:
        counts[r["kind"]] = counts.get(r["kind"], 0) + 1

    bundle = {
        "meta": {
            "source": BASE + ROOT,
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "page_count": len(records),
            "counts": counts,
            "note": "字段名与取值保持 wiki 原文(英文/原大小写), 因为 YAML 键名必须与插件一致",
        },
        "pages": records,
    }
    with open(os.path.join(OUT, "mythicmobs-wiki.json"), "w", encoding="utf-8") as f:
        json.dump(bundle, f, ensure_ascii=False, indent=1)

    # 7) 精简 schema
    schema = {"mechanics": {}, "conditions": {}, "targeters": {}, "triggers": {},
              "ai-goals": {}, "ai-targets": {}}
    for r in records:
        k = r["kind"]
        if k not in schema:
            continue
        key = r["title"].lower()
        schema[k][key] = {
            "title": r["title"],
            "aliases": r["aliases"],
            "description": r["description"],
            "attributes": r["attributes"],
            "examples": r["examples"][:2],
            "url": r["url"],
        }
    with open(os.path.join(OUT, "schema.json"), "w", encoding="utf-8") as f:
        json.dump(schema, f, ensure_ascii=False, indent=1)

    print("\n=== 完成 ===")
    for k, v in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"  {k:12s} {v}")
    print(f"  总计         {len(records)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
