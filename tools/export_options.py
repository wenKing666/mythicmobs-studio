#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""导出 Mobs/Options 全量清单（按 wiki 的通用/大类/具体生物分组）"""
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from crawl_wiki import ArticleParser  # noqa: E402

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(HERE, "data", "raw", "mythicmobs__Mobs__Options.html")
OUT_JSON = os.path.join(HERE, "data", "mob-options.json")
OUT_MD = os.path.join(HERE, "docs", "怪物Options一览.md")


def main():
    html = io.open(RAW, encoding="utf-8").read()
    p = ArticleParser()
    p.feed(html)

    group = None
    sub = None
    items = []
    cur = None

    for b in p.blocks:
        tag = b["tag"]
        text = b["text"].strip()
        if tag == "h1":
            group, sub = text, None
            continue
        if tag == "h2":
            sub = text
            continue
        if tag == "h3":
            sub = (sub + " / " + text) if sub else text
            continue
        if tag == "h4":
            cur = {
                "name": text,
                "group": group or "",
                "sub": sub or "",
                "subs": [sub] if sub else [],
                "description": "",
                "default": "",
                "example": "",
            }
            items.append(cur)
            continue
        if cur is None:
            continue
        if tag == "p" and not cur["description"]:
            cur["description"] = re.sub(r"\s+", " ", text)
        elif tag == "pre" and not cur["example"]:
            cur["example"] = text

    for it in items:
        m = re.search(r"[Dd]efaults? to\s+`?([^`.,;)]+)`?", it["description"])
        if m:
            it["default"] = m.group(1).strip()
        it["description"] = re.sub(r"\s+", " ", it["description"]).strip()

    # 合并同名条目（同一键在不同生物下重复出现）
    merged = {}
    for it in items:
        key = it["name"]
        if key in merged:
            for sb in it.get("subs", []):
                if sb and sb not in merged[key]["subs"]:
                    merged[key]["subs"].append(sb)
                    merged[key]["sub"] = merged[key]["sub"] or sb
            continue
        merged[key] = dict(it)
        merged[key]["sub"] = it["sub"]

    zh = {}
    gpath = os.path.join(HERE, "data", "zh", "glossary.json")
    if os.path.exists(gpath):
        g = json.load(io.open(gpath, encoding="utf-8"))
        zh = g.get("mob_options", {})

    rows = list(merged.values())
    for r in rows:
        r["zh"] = zh.get(r["name"], "")

    with io.open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)

    groups = [
        ("Universal options", "通用（所有生物都能用）"),
        ("Group specific options", "按生物大类"),
        ("Mob specific options", "按具体生物"),
    ]

    lines = [
        "# 怪物 Options 全量一览",
        "",
        "> 来源：官方 wiki `Mobs → Options`（抓取于 2026-10-21）。",
        "> 共 **%d** 个条目，去重后 **%d** 个键。同一个键可能出现在多个生物分组下（例如 `Color`）。" % (len(items), len(rows)),
        "",
        "| 分组 | 条目数 | 说明 |",
        "|---|---:|---|",
    ]
    for gid, label in groups:
        n = len([r for r in rows if r["group"] == gid])
        lines.append("| %s | %d | %s |" % (gid, n, label))

    for gid, label in groups:
        sub_rows = [r for r in rows if r["group"] == gid]
        if not sub_rows:
            continue
        lines += ["", "## " + gid + " —— " + label, ""]
        if gid == "Universal options":
            lines += ["| 键名 | 中文 | 默认值 | 说明 |", "|---|---|---|---|"]
            for r in sub_rows:
                lines.append("| `%s` | %s | %s | %s |" % (
                    r["name"], r["zh"], r["default"] or "—",
                    r["description"].replace("|", "\\|")[:110]))
        else:
            by_sub = {}
            for r in sub_rows:
                by_sub.setdefault(r["sub"] or "（未分组）", []).append(r)
            for s, rs in by_sub.items():
                lines += ["", "### " + s, "", "| 键名 | 中文 | 默认值 | 说明 |", "|---|---|---|---|"]
                for r in rs:
                    lines.append("| `%s` | %s | %s | %s |" % (
                        r["name"], r["zh"], r["default"] or "—",
                        r["description"].replace("|", "\\|")[:110]))

    io.open(OUT_MD, "w", encoding="utf-8").write("\n".join(lines) + "\n")

    print("entries:", len(items), "unique:", len(rows))
    for gid, _ in groups:
        print("  ", gid, len([r for r in rows if r["group"] == gid]))
    print("written:", OUT_JSON, OUT_MD)


if __name__ == "__main__":
    main()
