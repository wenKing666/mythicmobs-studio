# -*- coding: utf-8 -*-
"""把 data/spec/*.json 合成 app/js/spec-data.js（通用字段引擎的数据层）

用法：python tools/build_spec.py

数据格式（每个字段）：
  k   YAML 键名（必填）
  z   中文标签
  t   类型：text / num / bool / list / kv / obj / map / objlist / enum / conds / skills / raw
  d   默认值（只做界面提示，不主动写进 YAML）
  h   说明
  o   enum 的可选值
  f   子字段（obj / map / objlist 用）
  r   必填
"""
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPEC_DIR = os.path.join(ROOT, "data", "spec")
OUT = os.path.join(ROOT, "app", "js", "spec-data.js")

VALID_TYPES = {"text", "num", "bool", "list", "kv", "obj", "map", "objlist", "enum", "conds", "skills", "raw", "timeline"}
REQUIRED_KEYS = {"k"}
ALLOWED_KEYS = {"k", "z", "t", "d", "h", "o", "f", "r"}


def load(name):
    path = os.path.join(SPEC_DIR, name)
    with io.open(path, encoding="utf-8") as f:
        return json.load(f)


def check_fields(fields, where, errors):
    seen = set()
    for idx, f in enumerate(fields):
        if not isinstance(f, dict):
            errors.append("%s[%d] 不是对象" % (where, idx))
            continue
        missing = REQUIRED_KEYS - set(f)
        if missing:
            errors.append("%s[%d] 缺 %s" % (where, idx, ",".join(sorted(missing))))
        extra = set(f) - ALLOWED_KEYS
        if extra:
            errors.append("%s[%d] 多余键 %s" % (where, idx, ",".join(sorted(extra))))
        k = f.get("k")
        if k in seen:
            errors.append("%s 里 %s 重复" % (where, k))
        seen.add(k)
        t = f.get("t", "text")
        if t not in VALID_TYPES:
            errors.append("%s.%s 类型 %s 不认识" % (where, k, t))
        if t == "enum" and not f.get("o"):
            errors.append("%s.%s 是 enum 但没给 o" % (where, k))
        if t in ("obj", "map", "objlist"):
            sub = f.get("f")
            if not sub:
                errors.append("%s.%s 是 %s 但没给 f" % (where, k, t))
            else:
                check_fields(sub, "%s.%s" % (where, k), errors)


def main():
    modules = load("modules.json")
    mobs = load("mobs.json")
    errors = []

    types = modules.get("types") or {}
    if not types:
        errors.append("modules.json 里没有 types")

    for tid, spec in types.items():
        for key in ("kind", "title", "dir", "keyPrefix", "groups"):
            if key not in spec:
                errors.append("%s 缺 %s" % (tid, key))
        if spec.get("kind") != tid:
            errors.append("%s 的 kind 写成了 %s" % (tid, spec.get("kind")))
        for g in spec.get("groups") or []:
            check_fields(g.get("fields") or [], "%s.%s" % (tid, g.get("id")), errors)

    for g in (mobs.get("mobExtra") or {}).get("groups") or []:
        check_fields(g.get("fields") or [], "mobExtra.%s" % g.get("id"), errors)

    for cid, fields in (mobs.get("itemComponentFields") or {}).items():
        check_fields(fields, "itemComponent." + cid, errors)

    check_fields((mobs.get("fancyDrops") or {}).get("fields") or [], "fancyDrops", errors)

    if errors:
        for e in errors:
            print("✗ " + e)
        print("\n%d 处数据错误，未生成。" % len(errors))
        return 1

    payload = {
        "types": types,
        "mobExtra": mobs.get("mobExtra") or {"groups": []},
        "itemComponentFields": mobs.get("itemComponentFields") or {},
        "fancyDrops": mobs.get("fancyDrops") or {"title": "掉落特效", "fields": []},
    }

    text = "/* 自动生成，别手改。源数据 data/spec/*.json，生成脚本 tools/build_spec.py */\n"
    text += "window.MM_SPEC_DATA = " + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n"
    with io.open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)

    nfields = 0

    def count(fields):
        nonlocal nfields
        for f in fields:
            nfields += 1
            if f.get("f"):
                count(f["f"])

    for spec in types.values():
        for g in spec.get("groups") or []:
            count(g.get("fields") or [])
    for g in payload["mobExtra"]["groups"]:
        count(g.get("fields") or [])
    for fields in payload["itemComponentFields"].values():
        count(fields)

    size = os.path.getsize(OUT) / 1024.0
    print("spec-data.js  %.1f KB" % size)
    print("配置类型      %d" % len(types))
    print("字段条目      %d" % nfields)
    print("物品组件子键  %d 项" % len(payload["itemComponentFields"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
