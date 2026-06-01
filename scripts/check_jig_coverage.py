"""
check_jig_coverage.py
---------------------
对比布局 JSON 与治具位置 JSON，输出治具中哪些键位槽未被该布局使用。

用法:
  python scripts/check_jig_coverage.py ansi-104
  python scripts/check_jig_coverage.py apps/web/modules/design/data/layouts/ansi-87.json

参数：
  layout        布局文件路径，或 layouts 目录下的布局 ID（如 ansi-104 / ansi-87 / ansi-108）

可选参数（有默认值）:
  --positions   apps/web/modules/design/data/jig/keycap_jig_positions.json
  --layouts-dir apps/web/modules/design/data/layouts
  --tol         unit 匹配容差（默认 0.05U）

仅使用 Python 标准库，无需安装额外依赖。
"""

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path


_TOL = 0.05   # unit 匹配容差（U）


# ---------------------------------------------------------------------------
# 数据加载
# ---------------------------------------------------------------------------

def load_layout(layout_arg: str, layouts_dir: Path) -> dict:
    """
    加载布局 JSON。

    layout_arg 可以是：
      - 完整/相对文件路径（含 .json 后缀）
      - 布局 ID（如 ansi-104），自动在 layouts_dir 下查找
    """
    path = Path(layout_arg)
    if not path.exists():
        # 尝试作为 ID 在 layouts_dir 下查找
        candidate = layouts_dir / f"{layout_arg}.json"
        if candidate.exists():
            path = candidate
        else:
            print(f"[ERROR] 找不到布局文件: {layout_arg}", file=sys.stderr)
            sys.exit(1)

    with path.open(encoding="utf-8") as f:
        data = json.load(f)

    keys = {}
    for row in data.get("rows", []):
        for key in row.get("keys", []):
            kid = key.get("keyId", "")
            if kid:
                keys[kid] = {
                    "label": key.get("label", ""),
                    "w":     float(key.get("w", 1)),
                    "h":     float(key.get("h", 1)),
                    "x":     float(key.get("x", 0)),
                    "y":     float(key.get("y", 0)),
                }
    return {
        "id":        data.get("id", path.stem),
        "name":      data.get("name", ""),
        "totalKeys": data.get("totalKeys", len(keys)),
        "baseUnit":  float(data.get("baseUnit", 54)),
        "keys":      keys,
        "path":      str(path),
    }


def load_positions(positions_path: Path) -> list[dict]:
    with positions_path.open(encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# 匹配逻辑
# ---------------------------------------------------------------------------

def build_layout_key_set(layout: dict) -> dict[str, float]:
    """返回 key_id -> w(unit) 映射（含所有布局键位）。"""
    return {kid: info["w"] for kid, info in layout["keys"].items()}


def build_composite_groups(positions: list[dict]) -> dict[str, list[dict]]:
    """
    返回 geometry_group -> [pos, ...] 映射，仅包含多槽组合键组。

    多槽组合键：同一 geometry_group 下有多个治具条目，
    代表一个物理键占用多个治具槽（典型例子：ISO 梯形回车键）。
    """
    groups: dict[str, list] = defaultdict(list)
    for pos in positions:
        gg = pos.get("geometry_group")
        if gg:
            groups[gg].append(pos)
    return {gg: members for gg, members in groups.items() if len(members) > 1}


def match_positions(positions: list[dict], layout_keys: dict[str, float]) -> tuple[list, list]:
    """
    将每个治具位置条目归类为"已匹配"或"未使用"。

    匹配规则：
      1. pos["key_id"] 必须在 layout_keys 中
      2. 当同一 key_id 在治具中存在多种 unit 变体时，
         取与 layout_keys[key_id] 最接近（且差值 ≤ TOL）的那一条；
         其余变体视为未使用（用于其他布局的备用槽）。
      3. 组合键（共享同一 geometry_group 的多个槽，如 ISO 梯形回车）
         作为整体一起匹配或未使用，不单独拆分处理。

    返回：(matched, unused)
      matched: 被该布局使用的治具条目列表
      unused:  未被该布局使用的治具条目列表
    """
    # 识别组合键组（如 ISO Enter 的两个槽）
    composite_groups = build_composite_groups(positions)
    # 建立 index -> geometry_group 的反查表
    index_to_group: dict[int, str] = {}
    for gg, members in composite_groups.items():
        for pos in members:
            index_to_group[pos.get("index")] = gg

    # 统计每个 key_id 在治具中出现了哪些有效 unit
    # 组合键以"一个代表 unit"计入（避免同一 unit 因多槽被重复统计）
    effective_units: dict[str, set] = defaultdict(set)
    seen_groups: set[str] = set()
    for pos in positions:
        kid  = pos.get("key_id", "")
        unit = pos.get("unit")
        gg   = pos.get("geometry_group")
        if not kid or unit is None:
            continue
        if gg and gg in composite_groups:
            if gg in seen_groups:
                continue   # 组合键只记录一次 unit
            seen_groups.add(gg)
        effective_units[kid].add(unit)

    matched: list[dict] = []
    unused:  list[dict] = []
    processed_groups: set[str] = set()

    for pos in positions:
        idx = pos.get("index")
        kid = pos.get("key_id", "")
        unit = pos.get("unit")
        gg  = index_to_group.get(idx)

        # ── 组合键：整组一起处理 ──────────────────────────────────────
        if gg:
            if gg in processed_groups:
                continue   # 已被组内首条记录处理过
            processed_groups.add(gg)

            members     = composite_groups[gg]
            group_kid   = members[0].get("key_id", "")
            group_unit  = members[0].get("unit")

            if not group_kid:
                unused.extend(members)
                continue
            if group_kid not in layout_keys:
                unused.extend(members)
                continue

            layout_w       = layout_keys[group_kid]
            units_for_key  = effective_units[group_kid]

            if len(units_for_key) <= 1:
                matched.extend(members)
            elif group_unit is not None and abs(group_unit - layout_w) <= _TOL:
                matched.extend(members)
            else:
                unused.extend(members)
            continue

        # ── 普通键：逐条处理 ──────────────────────────────────────────
        if not kid:
            unused.append(pos)
            continue

        if kid not in layout_keys:
            unused.append(pos)
            continue

        layout_w          = layout_keys[kid]
        units_for_this_key = effective_units[kid]

        if len(units_for_this_key) <= 1:
            matched.append(pos)
        else:
            if unit is not None and abs(unit - layout_w) <= _TOL:
                matched.append(pos)
            else:
                unused.append(pos)

    return matched, unused


# ---------------------------------------------------------------------------
# 报告输出
# ---------------------------------------------------------------------------

def _row_label(pos: dict) -> str:
    rl = pos.get("row_level", "")
    return f"[{rl}]" if rl else ""


def _group_composite_entries(slot_list: list[dict]) -> list[dict | list[dict]]:
    """
    将列表中共享同一 geometry_group 的条目合并为子列表，其余保持原样。

    返回的列表每个元素要么是单个 dict（普通键），
    要么是 list[dict]（同一组合键的多个槽）。
    """
    groups: dict[str, list] = defaultdict(list)
    result: list = []
    for pos in slot_list:
        gg = pos.get("geometry_group")
        if gg:
            groups[gg].append(pos)
        else:
            result.append(pos)
    # 按最小 index 排序后插回
    for members in groups.values():
        result.append(members)
    result.sort(key=lambda x: (x[0].get("index", 0) if isinstance(x, list) else x.get("index", 0)))
    return result


def print_report(layout: dict, positions: list, matched: list, unused: list) -> None:
    total = len(positions)
    n_matched = len(matched)
    n_unused  = len(unused)

    print("=" * 64)
    print(f"  布局: {layout['name']}  ({layout['id']})")
    print(f"  文件: {layout['path']}")
    print(f"  键位数: {layout['totalKeys']}  |  治具总槽位: {total}")
    print(f"  已匹配: {n_matched}  |  未使用空余: {n_unused}")
    print("=" * 64)

    if not unused:
        print("\n✓ 治具所有槽位均被该布局使用，无空余键位。\n")
        return

    # 按 key_id 是否为空分类
    empty_id_slots = [p for p in unused if not p.get("key_id", "")]
    no_match_slots = [p for p in unused if     p.get("key_id", "")]

    if no_match_slots:
        print(f"\n── 治具有键位 ID、但布局不包含的槽位 ({len(no_match_slots)} 个槽) ──")
        print(f"  {'#idx':<10} {'key_id':<16} {'unit':>6}  {'row_level':<8}  说明")
        print(f"  {'-'*10} {'-'*16} {'-'*6}  {'-'*8}  {'-'*36}")
        for entry in _group_composite_entries(no_match_slots):
            if isinstance(entry, list):
                # 组合键：多槽合并显示
                indices = "+".join(str(p.get("index", "?")) for p in entry)
                kid     = entry[0].get("key_id", "")
                unit    = entry[0].get("unit", "?")
                rl      = entry[0].get("row_level", "")
                gg      = entry[0].get("geometry_group", "")
                if kid in layout["keys"]:
                    reason = (f"unit={unit:.2f} 与布局 w={layout['keys'][kid]['w']:.2f} 不匹配"
                              f"（组合键备用变体，{len(entry)} 槽，group={gg}）")
                else:
                    reason = f"该键位 ID 不在此布局中（组合键，{len(entry)} 槽，group={gg}）"
                print(f"  {indices:<10} {kid:<16} {unit!s:>6}  {rl:<8}  {reason}")
            else:
                pos  = entry
                idx  = pos.get("index", "?")
                kid  = pos.get("key_id", "")
                unit = pos.get("unit", "?")
                rl   = pos.get("row_level", "")
                if kid in layout["keys"]:
                    reason = f"unit={unit:.2f} 与布局 w={layout['keys'][kid]['w']:.2f} 不匹配（备用变体）"
                else:
                    reason = "该键位 ID 不在此布局中（仅其他键盘型号使用）"
                print(f"  {idx!s:<10} {kid:<16} {unit!s:>6}  {rl:<8}  {reason}")

    if empty_id_slots:
        print(f"\n── key_id 为空的预留槽位 ({len(empty_id_slots)} 个) ──")
        print(f"  {'#idx':<6} {'shape':<10} {'unit':>6}  {'row_level':<8}  位置(cx, cy)")
        print(f"  {'-'*6} {'-'*10} {'-'*6}  {'-'*8}  {'-'*30}")
        for pos in sorted(empty_id_slots, key=lambda p: p.get("index", 0)):
            idx   = pos.get("index", "?")
            shape = pos.get("shape", "?")
            unit  = pos.get("unit", "?")
            rl    = pos.get("row_level", "")
            cx    = pos.get("cross_cx", "?")
            cy    = pos.get("cross_cy", "?")
            print(f"  {idx!s:<6} {shape:<10} {unit!s:>6}  {rl:<8}  ({cx}, {cy})")

    print()
    # 汇总：按 unit（键帽宽度）统计未使用槽
    unit_counter: dict = defaultdict(int)
    for pos in unused:
        unit_counter[pos.get("unit")] += 1

    print("── 未使用槽位按宽度汇总 ──")
    for unit in sorted(unit_counter, key=lambda u: (u is None, u)):
        label = f"{unit:.2f}U" if isinstance(unit, (int, float)) else str(unit)
        print(f"  {label:>8}  ×{unit_counter[unit]}")

    print()


# ---------------------------------------------------------------------------
# CLI 入口
# ---------------------------------------------------------------------------

def parse_args():
    p = argparse.ArgumentParser(
        description="对比布局 JSON 与治具位置 JSON，输出治具中未被该布局使用的空余键位槽"
    )
    p.add_argument(
        "layout",
        help="布局 JSON 文件路径，或 layouts 目录下的布局 ID（如 ansi-104）",
    )
    p.add_argument(
        "--positions",
        default="apps/web/modules/design/data/jig/keycap_jig_positions.json",
        help="治具位置 JSON 路径（默认：keycap_jig_positions.json）",
    )
    p.add_argument(
        "--layouts-dir",
        default="apps/web/modules/design/data/layouts",
        help="布局 JSON 目录（默认：.../layouts）",
    )
    p.add_argument(
        "--tol",
        type=float,
        default=_TOL,
        help=f"unit 匹配容差（默认 {_TOL}U）",
    )
    return p.parse_args()


def main():
    global _TOL
    args = parse_args()
    _TOL = args.tol

    positions_path = Path(args.positions)
    layouts_dir    = Path(args.layouts_dir)

    if not positions_path.exists():
        print(f"[ERROR] 治具位置文件不存在: {positions_path}", file=sys.stderr)
        sys.exit(1)

    layout    = load_layout(args.layout, layouts_dir)
    positions = load_positions(positions_path)

    layout_keys = build_layout_key_set(layout)
    matched, unused = match_positions(positions, layout_keys)

    print_report(layout, positions, matched, unused)


if __name__ == "__main__":
    main()
