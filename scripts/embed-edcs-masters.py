#!/usr/bin/env python3
"""Regenerate packages/core-domain/src/edcs-template-masters.mjs from the BizKick controlled masters.

Usage: python3 scripts/embed-edcs-masters.py <path to 01_Controlled_Documents>
Reads (never writes) the three masters and embeds them as base64 so the server can copy them.
"""
import base64, sys, pathlib

MASTERS = {
    "BK-SAL-001": "02_Sales_Customer/BK-SAL-001_Quotation.xlsx",
    "BK-SAL-004": "02_Sales_Customer/BK-SAL-004_Invoice.xlsx",
    "BK-PRO-004": "04_Procurement_Vendor/BK-PRO-004_Purchase_Order.xlsx",
}
SOURCE = "BizKick EDCS v1.01 Product Master"
OUT = pathlib.Path(__file__).resolve().parent.parent / "packages/core-domain/src/edcs-template-masters.mjs"

def find(root, rel):
    direct = root / rel
    if direct.exists():
        return direct
    name = pathlib.Path(rel).name
    hits = list(root.rglob(name))
    if not hits:
        sys.exit(f"Master not found: {name}")
    return hits[0]

def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    root = pathlib.Path(sys.argv[1])
    lines = [
        "// CE-S8 (ADR-107): read-only copies of the BizKick controlled masters the template filler starts from.",
        f"// Generated from {SOURCE} (01_Controlled_Documents). NEVER edit by hand: the filler",
        "// copies these bytes and fills a new working file; the masters themselves are never changed or written back.",
        "// Why embedded: the API runs on a server (Vercel) that cannot read the owner's BizKick folder.",
        "// Regenerate with: python3 scripts/embed-edcs-masters.py <path to 01_Controlled_Documents>",
        "",
        f'export const MASTER_SOURCE = "{SOURCE}";',
        "",
        "export const MASTERS_B64 = {",
    ]
    items = []
    for key, rel in MASTERS.items():
        path = find(root, rel)
        b64 = base64.b64encode(path.read_bytes()).decode()
        items.append(f'  "{key}": {{ file: "{path.name}", b64: "{b64}" }}')
    lines.append(",\n".join(items))
    lines.append("};")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")

main()
