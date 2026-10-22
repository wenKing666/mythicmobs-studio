#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""示例: 编辑器读到 schema.json 之后怎么用

  python tools/demo_query.py message
  python tools/demo_query.py --list mechanics
"""
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(HERE, "data")

BUCKET = {"mechanic": "mechanics", "condition": "conditions", "targeter": "targeters",
          "trigger": "triggers", "particle": "particles"}


def main():
    with open(os.path.join(DATA, "schema.json"), encoding="utf-8") as f:
        schema = json.load(f)
    with open(os.path.join(DATA, "zh", "glossary.json"), encoding="utf-8") as f:
        zh = json.load(f)

    if len(sys.argv) < 2 or sys.argv[1] == "--help":
        print(__doc__)
        return 0

    if sys.argv[1] == "--list":
        bucket = BUCKET.get(sys.argv[2], sys.argv[2])
        names = sorted(schema.get(bucket, {}), key=str.lower)
        print(f"{bucket}: {len(names)}")
        print("、".join(names))
        return 0

    want = sys.argv[1].lower()
    hits = []
    for bucket, items in schema.items():
        if bucket == "meta":
            continue
        for name, v in items.items():
            if name.lower() == want or want in [a.lower() for a in v.get("aliases", [])]:
                hits.append((bucket, name, v))
    if not hits:
        print(f"没找到 {want}")
        return 1

    bucket, name, v = hits[0]
    print(f"## {name}   [{bucket}]")
    print(f"URL: {v['url']}")
    if v.get("aliases"):
        print(f"别名: {', '.join(v['aliases'])}")
    if v.get("inherits"):
        print(f"继承: {v['inherits']} 的全部属性")
    print(f"\n{v['description']}\n")
    print("参数:")
    for a in v.get("attributes", []):
        alias = f"  (别名: {', '.join(a['aliases'])})" if a["aliases"] else ""
        default = f"  默认: {a['default']}" if a["default"] else ""
        print(f"  - {a['name']}{alias}{default}")
        if a["description"]:
            print(f"      {a['description']}")
    if v.get("examples"):
        print("\n示例:")
        for ex in v["examples"][:1]:
            print(ex)
    return 0


if __name__ == "__main__":
    sys.exit(main())
