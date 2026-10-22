#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""抓取结果 → 去重 / 归类 / 产出编辑器可用的 schema 与中文索引"""
import collections
import hashlib
import json
import os
import re
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(HERE, "data")

INDEX_TITLES = {"mechanics", "conditions", "targeters", "triggers", "ai goals", "ai targets",
                "skills", "mobs", "items", "drops", "spawners", "stats", "particle types"}

KIND_ZH = {
    "mechanic": "技能机制",
    "condition": "条件",
    "targeter": "目标选择器",
    "trigger": "触发器",
    "particle": "粒子类型",
    "ai-goal": "AI 行为(AIGoal)",
    "ai-target": "AI 目标(AITarget)",
    "doc": "文档页",
    "index": "索引页",
}

BUCKET = {
    "mechanic": "mechanics",
    "condition": "conditions",
    "targeter": "targeters",
    "trigger": "triggers",
    "particle": "particles",
    "ai-goal": "ai-goals",
    "ai-target": "ai-targets",
}


def classify(p):
    """按面包屑细化分类; 返回新 kind"""
    crumbs = [c.lower() for c in p["breadcrumbs"]]
    path = p["path"]
    if "/Particle-Types/" in path or path.rstrip("/").endswith("/Particle-Types"):
        return "particle"
    if "ai" in crumbs and "goals" in crumbs:
        return "ai-goal"
    if "ai" in crumbs and "targets" in crumbs:
        return "ai-target"
    if p["kind"] in ("mechanic", "condition", "targeter", "trigger"):
        return p["kind"]
    return "doc"


def is_index(p):
    last = p["path"].rstrip("/").split("/")[-1].lower()
    return last in INDEX_TITLES and len(p["attributes"]) == 0 and len(p["fields"]) == 0


def dedupe(pages):
    groups = collections.defaultdict(list)
    for p in pages:
        h = hashlib.md5((p["content_md"] + p["title"]).encode("utf-8")).hexdigest()
        groups[(p["kind"], h)].append(p)
    out = []
    for (kind, h), g in groups.items():
        g.sort(key=lambda p: (len(p["path"]), p["path"]))
        keep = dict(g[0])
        keep["alt_urls"] = [x["url"] for x in g[1:]]
        keep["name"] = keep["title"]
        out.append(keep)
    return out


def main():
    with open(os.path.join(DATA, "mythicmobs-wiki.json"), encoding="utf-8") as f:
        bundle = json.load(f)
    pages = bundle["pages"]

    for p in pages:
        p["kind"] = classify(p)

    idx = [p for p in pages if is_index(p)]
    for p in idx:
        p["kind"] = "index"
    body = [p for p in pages if not is_index(p)]

    deduped = dedupe(body)
    deduped.sort(key=lambda p: (p["kind"], p["title"].lower()))

    counts = collections.Counter(p["kind"] for p in deduped)

    schema = {k: {} for k in BUCKET.values()}
    docs = {}
    for p in deduped:
        bucket = BUCKET.get(p["kind"])
        if bucket:
            schema[bucket][p["title"]] = {
                "name": p["title"],
                "aliases": p["aliases"],
                "description": p["description"],
                "inherits": p.get("inherits", ""),
                "attributes": p["attributes"],
                "fields": p["fields"],
                "examples": p["examples"][:2],
                "url": p["url"],
            }
        else:
            docs[p["path"].replace("/mythicmobs/", "")] = {
                "title": p["title"],
                "path": p["path"],
                "url": p["url"],
                "description": p["description"],
                "fields": p["fields"],
                "examples": p["examples"][:3],
                "content_md": p["content_md"],
            }

    comp = [p for p in deduped if p["kind"] in BUCKET]
    stats = {
        "crawled_pages": len(pages),
        "unique_pages": len(deduped),
        "counts": dict(counts),
        "component_pages": len(comp),
        "components_with_attributes": len([p for p in comp if p["attributes"]]),
        "components_with_fields": len([p for p in comp if p["fields"]]),
        "total_attributes": sum(len(p["attributes"]) for p in comp),
        "total_fields": sum(len(p["fields"]) for p in deduped),
        "total_examples": sum(len(p["examples"]) for p in deduped),
    }

    out = {
        "meta": {
            "source": bundle["meta"]["source"],
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "note": "键名与取值保留 wiki 原文(英文/原大小写), YAML 键名必须与插件一致; 中文对照见 data/zh/",
            **stats,
        },
        "schema": schema,
        "docs": docs,
        "pages": deduped,
        "index_pages": idx,
    }
    with open(os.path.join(DATA, "mythicmobs-wiki.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    with open(os.path.join(DATA, "schema.json"), "w", encoding="utf-8") as f:
        json.dump({"meta": out["meta"], **schema}, f, ensure_ascii=False, indent=1)

    print("=== 页面统计 ===")
    for k, v in counts.most_common():
        print(f"  {k:10s} {v:4d}   {KIND_ZH.get(k,'')}")
    print(f"  {'总计':9s} {len(deduped):4d}")
    print("\n=== schema 分组 ===")
    for k, v in schema.items():
        print(f"  {k:12s} {len(v):4d} 条")
    print("\n=== 抽取量 ===")
    print(f"  组件页 {stats['component_pages']}, 带属性表 {stats['components_with_attributes']}")
    print(f"  属性条目 {stats['total_attributes']}, 字段条目 {stats['total_fields']}, 示例 {stats['total_examples']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
