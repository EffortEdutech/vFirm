#!/usr/bin/env python3
"""
Build the synthetic "Nexa Office Supplies (NEX)" BizKick fixture pack for vFirm Connected EDCS.

CE-S0 (ADR-094). SYNTHETIC DATA ONLY - no real client, supplier, employee or bank data.

Inputs
  --instance  A BizKick client instance generated with BizKick's own build tools
              (05_Build_Tools/generate_client_edcs.py with clientCode "NEX"), already
              branding-checked with test_branding_contamination.py --client.
  --out       Output folder (default: the folder this script lives in).
  --as-of     Date the cached formula values are computed for (default 2026-10-05).

What it does (and never does)
  * Starts from the generated BK-SYS-005 register and edits ONLY the TRANSACTION REGISTER
    sheet XML. Every other part of the package (styles, validations, dashboard chart, tables)
    is copied byte-for-byte. It never edits a BizKick product master.
  * Shipped BizKick registers contain formulas WITHOUT cached values. The baseline writes the
    values Excel/LibreOffice would cache (so importers can read them); `register_08_no_cached_values`
    keeps the shipped behaviour (formulas only) so the importer's recompute path is tested.
  * Writes expected_outcomes.json: the outcome every row must get on import, for every file.

Usage
  python build_nexa_fixture.py --instance /path/to/NEX_instance
"""
import argparse
import csv
import hashlib
import io
import json
import re
import shutil
from datetime import date
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

from lxml import etree

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
X = "{%s}" % NS
CLOSED = {"Completed", "Cancelled", "Rejected", "Superseded"}
FIRST_ROW = 7
CODE = "NEX"


def d(s):
    return date.fromisoformat(s) if s else None


def serial(dt):
    return (dt - date(1899, 12, 30)).days


def R(t, y, s, rev="R0", res="", iss="", cpt="", cpn="", subj="", amt=None, cur="MYR", st="",
      own="", due="", rel="", ext="", link="", upd="", rem=""):
    return dict(type=t, year=y, seq=s, rev=rev, reserved=res, issued=iss, cptype=cpt, cpname=cpn,
                subject=subj, amount=amt, cur=cur, status=st, owner=own, due=due, related=rel,
                extref=ext, link=link, updated=upd, remarks=rem)


def tid(t, y, s):
    return "%s-%s-%04d-%04d" % (CODE, t, y, s)


AL, BE, GA, DE, EP, ZE, ET = ("Alpha Tech Resources", "Beta Mart", "Gamma Learning Centre", "Delta Clinic",
                              "Epsilon Logistics", "Zeta Hotel", "Eta Salon")
PP, TW, OM = "PaperPlus Trading", "TonerWorks", "Omega Stationery"
SALES, PROC, FIN, HR, STORE, OWNER = "Aisha R.", "Daniel T.", "Mei L.", "HR Admin", "Store Keeper", "Owner"
LINK = "Documents/NEX/%s"


def baseline_rows():
    return [
        # ---- Sales chain A: complete, healthy (QT revised once -> R1) -------------------
        R("QT", 2026, 1, "R1", "2026-06-28", "2026-07-06", "Customer", AL, "Q4 office stationery bulk supply", 18400, st="Accepted", own=SALES, due="2026-08-05", link=LINK % "Sales/NEX-QT-2026-0001_R1_Alpha-Tech-Resources.xlsx", upd="2026-07-20", rem="R1 after agreed discount (R0 was 18,900)"),
        R("SO", 2026, 1, "R0", "2026-07-21", "2026-07-22", "Customer", AL, "Sales order - Q4 stationery", 18400, st="Completed", own=SALES, rel=tid("QT", 2026, 1), link=LINK % "Sales/NEX-SO-2026-0001_Alpha-Tech-Resources.xlsx", upd="2026-08-06"),
        R("DO", 2026, 1, "R0", "2026-08-05", "2026-08-06", "Customer", AL, "Delivery - Q4 stationery", None, st="Completed", own=STORE, rel=tid("SO", 2026, 1), link=LINK % "Sales/NEX-DO-2026-0001_Alpha-Tech-Resources.xlsx", upd="2026-08-06"),
        R("INV", 2026, 1, "R0", "2026-08-06", "2026-08-20", "Customer", AL, "Invoice - Q4 stationery", 18400, st="Completed", own=FIN, due="2026-09-19", rel=tid("DO", 2026, 1), link=LINK % "Finance/NEX-INV-2026-0001_Alpha-Tech-Resources.xlsx", upd="2026-09-12"),
        R("RC", 2026, 1, "R0", "2026-09-12", "2026-09-12", "Customer", AL, "Receipt - invoice 0001", 18400, st="Completed", own=FIN, rel=tid("INV", 2026, 1), link=LINK % "Finance/NEX-RC-2026-0001_Alpha-Tech-Resources.xlsx", upd="2026-09-12"),
        R("CN", 2026, 1, "R0", "2026-09-15", "2026-09-15", "Customer", AL, "Credit note - returned damaged items", 450, st="Issued", own=FIN, rel=tid("INV", 2026, 1), upd="2026-09-15"),
        # ---- Sales chain B: overdue invoice -------------------------------------------
        R("QT", 2026, 2, "R0", "2026-07-28", "2026-07-30", "Customer", BE, "Cafeteria paper goods", 7250, st="Accepted", own=SALES, due="2026-08-29", upd="2026-08-02"),
        R("SO", 2026, 2, "R0", "2026-08-02", "2026-08-02", "Customer", BE, "Sales order - paper goods", 7250, st="Completed", own=SALES, rel=tid("QT", 2026, 2), upd="2026-08-22"),
        R("DO", 2026, 2, "R0", "2026-08-22", "2026-08-22", "Customer", BE, "Delivery - paper goods", None, st="Completed", own=STORE, rel=tid("SO", 2026, 2), upd="2026-08-22"),
        R("INV", 2026, 2, "R0", "2026-08-25", "2026-08-25", "Customer", BE, "Invoice - paper goods", 7250, st="Issued", own=FIN, due="2026-09-24", rel=tid("DO", 2026, 2), upd="2026-08-25", rem="Reminder 1 not yet sent"),
        R("CMP", 2026, 1, "R0", "2026-09-29", "", "Customer", BE, "Wrong toner cartridges delivered", None, st="Under Review", own=SALES, due="2026-10-10", rel=tid("INV", 2026, 2), upd="2026-09-29"),
        R("CMP", 2026, 2, "R0", "2026-08-10", "", "Customer", GA, "Late delivery of stationery", None, st="Completed", own=SALES, upd="2026-08-18"),
        # ---- Quotations in various states -----------------------------------------------
        R("QT", 2026, 3, "R0", "2026-09-30", "2026-10-01", "Customer", GA, "Classroom supplies term 4", 4980, st="Issued", own=SALES, due="2026-10-08", upd="2026-10-01", rem="Expires in 3 days (DUE SOON at as-of date)"),
        R("QT", 2026, 4, "R0", "2026-09-17", "2026-09-18", "Customer", DE, "Clinic forms and stationery", 22000, st="Issued", own=SALES, due="2026-10-20", upd="2026-09-18"),
        R("QT", 2026, 5, "R0", "2026-09-09", "2026-09-10", "Customer", EP, "Warehouse labels and tapes", 9600, st="Superseded", own=SALES, due="2026-10-10", upd="2026-09-20", rem="Replaced by NEX-QT-2026-0006"),
        R("QT", 2026, 6, "R0", "2026-09-19", "2026-09-20", "Customer", EP, "Warehouse labels and tapes (revised scope)", 9100, st="Issued", own=SALES, due="2026-10-25", rel=tid("QT", 2026, 5), upd="2026-09-20", rem="Replacement for NEX-QT-2026-0005"),
        R("QT", 2026, 7, "R1", "2026-09-28", "2026-09-30", "Customer", ZE, "Hotel housekeeping stationery", 31200, st="Issued", own=SALES, due="2026-10-12", upd="2026-09-30", rem="R1 adds delivery to 2nd site (R0 was 28,700)"),
        R("QT", 2026, 8, "R0", "2026-09-05", "", "Customer", ET, "Salon receipts and pads", 3200, st="Cancelled", own=SALES, upd="2026-09-12", rem="Customer withdrew enquiry"),
        R("QT", 2026, 9, "R0", "2026-10-03", "", "", "", "Reserved - not yet drafted", None, st="Reserved", own=SALES, upd="2026-10-03"),
        R("QT", 2025, 42, "R0", "2025-10-30", "2025-11-03", "Customer", AL, "FY25 toner annual supply", 6100, st="Completed", own=SALES, due="2025-12-03", upd="2025-12-01"),
        R("SO", 2026, 4, "R0", "2026-10-02", "", "Customer", DE, "Sales order - clinic forms (draft)", 22000, st="Draft", own=SALES, rel=tid("QT", 2026, 4), upd="2026-10-02", rem="SO-2026-0003 number unused (gap kept)"),
        R("DO", 2026, 3, "R0", "2026-09-30", "", "Customer", BE, "Delivery - pending order", None, st="Under Review", own=STORE, rel=tid("SO", 2026, 3), upd="2026-09-30", rem="Related SO not in register"),
        # ---- Duplicate Transaction ID (two rows, same ID) ------------------------------
        R("INV", 2026, 3, "R0", "2026-09-26", "2026-09-30", "Customer", GA, "Invoice - stationery September", 2100, st="Issued", own=FIN, due="2026-10-30", upd="2026-09-30"),
        R("INV", 2026, 3, "R0", "2026-09-26", "2026-09-30", "Customer", DE, "Invoice - medical forms September", 3300, st="Issued", own=FIN, due="2026-10-30", upd="2026-09-30", rem="Same ID typed twice by mistake"),
        R("INV", 2026, 4, "R0", "2026-10-02", "2026-10-02", "Customer", EP, "Invoice - labels and tapes", 5600, st="Issued", own=FIN, due="2026-11-01", upd="2026-10-02"),
        # ---- Procurement: complete chain PR->RFQ->QC->PO->GRN, payment -----------------
        R("PR", 2026, 1, "R0", "2026-08-12", "2026-08-12", "Internal", "Internal", "A4 paper 200 reams", 3000, st="Completed", own=PROC, upd="2026-08-15"),
        R("RFQ", 2026, 1, "R0", "2026-08-13", "2026-08-13", "Supplier", PP, "RFQ - A4 paper", None, st="Completed", own=PROC, rel=tid("PR", 2026, 1), ext="PPT/Q/8841", upd="2026-08-15", rem="Supplier quotation reference kept in Original External Ref"),
        R("QC", 2026, 1, "R0", "2026-08-16", "2026-08-16", "Internal", "Internal", "Quotation comparison - A4 paper", None, st="Completed", own=PROC, rel=tid("RFQ", 2026, 1), upd="2026-08-16"),
        R("PO", 2026, 1, "R0", "2026-08-17", "2026-08-17", "Supplier", PP, "Purchase order - A4 paper", 2850, st="Completed", own=PROC, rel=tid("QC", 2026, 1), upd="2026-08-30"),
        R("GRN", 2026, 1, "R0", "2026-08-30", "2026-08-30", "Supplier", PP, "Goods received - A4 paper", None, st="Completed", own=STORE, rel=tid("PO", 2026, 1), upd="2026-08-30"),
        R("PV", 2026, 1, "R0", "2026-09-05", "", "Supplier", PP, "Payment voucher - A4 paper", 2850, st="Approved", own=FIN, rel=tid("PO", 2026, 1), upd="2026-09-05"),
        R("PR", 2026, 2, "R0", "2026-09-10", "2026-09-10", "Internal", "Internal", "Toner cartridges", 5400, st="Completed", own=PROC, upd="2026-09-12"),
        R("PO", 2026, 2, "R0", "2026-09-12", "2026-09-12", "Supplier", TW, "Purchase order - toner cartridges", 5400, st="Issued", own=PROC, due="2026-10-15", rel=tid("PR", 2026, 2), upd="2026-09-12", rem="Delivery expected 15 Oct"),
        R("GRN", 2026, 2, "R0", "2026-09-22", "2026-09-22", "Supplier", OM, "Goods received - envelopes", 1200, st="Completed", own=STORE, upd="2026-09-22", rem="Delivered without PO - regularise (GRN with no PO)"),
        R("PR", 2026, 3, "R0", "2026-09-25", "", "Internal", "Internal", "Replacement laptops", 12800, st="On Hold", own=PROC, upd="2026-09-25", rem="Waiting for budget approval"),
        R("PO", 2026, 3, "R0", "2026-10-01", "", "Supplier", "Sample Overseas Supply", "Purchase order - imported binders", 1800, cur="USD", st="Draft", own=PROC, upd="2026-10-01"),
        R("SE", 2026, 1, "R0", "2026-09-30", "2026-09-30", "Supplier", PP, "Supplier evaluation - PaperPlus", None, st="Completed", own=PROC, upd="2026-09-30"),
        # ---- Finance ----------------------------------------------------------------------
        R("BR", 2026, 1, "R0", "2026-09-03", "2026-09-05", "Bank", "Sample Bank Berhad", "Bank reconciliation - August 2026", None, st="Completed", own=FIN, upd="2026-09-05"),
        R("BR", 2026, 2, "R0", "2026-10-02", "", "Bank", "Sample Bank Berhad", "Bank reconciliation - September 2026", None, st="Draft", own=FIN, due="2026-10-10", link=LINK % "Finance/NEX-BR-2026-0002_bank_statement_2026-09.csv", upd="2026-10-02", rem="Bank statement attached"),
        R("EC", 2026, 1, "R0", "2026-09-27", "2026-09-27", "Employee", "Staff Member 04", "Expense claim - client visit", 380.50, st="Under Review", own=FIN, upd="2026-09-27"),
        R("PCV", 2026, 1, "R0", "2026-09-18", "2026-09-18", "Employee", "Staff Member 05", "Petty cash - courier", 85, st="Completed", own=FIN, upd="2026-09-18"),
        R("JV", 2026, 1, "R0", "2026-09-30", "2026-09-30", "Internal", "Internal", "Journal - accrual adjustment", 1200, st="Approved", own=FIN, upd="2026-09-30"),
        # ---- HR (metadata-only by default content policy) ----------------------------
        R("EMP", 2026, 1, "R0", "2026-09-29", "2026-09-30", "Employee", "Staff Member 07", "New hire - Sales Executive", None, st="Approved", own=HR, link=LINK % "HR/NEX-EMP-2026-0001_Offer_Letter.docx", upd="2026-09-30"),
        R("LV", 2026, 1, "R0", "2026-09-20", "2026-09-20", "Employee", "Staff Member 02", "Annual leave 12-16 Oct", None, st="Approved", own=HR, upd="2026-09-21"),
        R("LV", 2026, 2, "R0", "2026-10-01", "", "Employee", "Staff Member 03", "Leave application", None, st="Under Review", own=HR, upd="2026-10-01"),
        R("TS", 2026, 1, "R0", "2026-10-01", "2026-10-01", "Employee", "Staff Member 02", "Timesheet September 2026", None, st="Completed", own=HR, upd="2026-10-01"),
        R("OT", 2026, 1, "R0", "2026-09-26", "", "Employee", "Staff Member 03", "Overtime request", None, st="Under Review", own=HR, upd="2026-09-26"),
        R("EXIT", 2026, 1, "R0", "2026-10-02", "", "Employee", "Staff Member 08", "Exit checklist", None, st="Draft", own=HR, due="2026-10-31", upd="2026-10-02"),
        # ---- Inventory --------------------------------------------------------------------
        R("SI", 2026, 1, "R0", "2026-09-08", "2026-09-08", "Internal", "Internal", "Stock issue - office use", None, st="Completed", own=STORE, upd="2026-09-08"),
        R("ST", 2026, 1, "R0", "2026-09-14", "2026-09-14", "Internal", "Internal", "Stock transfer - store to counter", None, st="Completed", own=STORE, upd="2026-09-14"),
        R("SA", 2026, 1, "R0", "2026-09-29", "", "Internal", "Internal", "Stock adjustment - damaged toner", 2300, st="Under Review", own=STORE, upd="2026-09-29"),
        R("SCV", 2026, 1, "R0", "2026-09-30", "2026-09-30", "Internal", "Internal", "Stock count variance - September", None, st="Completed", own=STORE, upd="2026-09-30"),
        # ---- Legal and management -----------------------------------------------------
        R("NDA", 2026, 1, "R0", "2026-07-01", "2026-07-02", "Customer", AL, "Mutual NDA", None, st="Issued", own=OWNER, due="2026-12-31", upd="2026-07-02"),
        R("AGR", 2026, 1, "R0", "2026-09-15", "2026-09-16", "Customer", BE, "Annual supply agreement", None, st="Issued", own=OWNER, due="2026-10-31", upd="2026-09-16"),
        R("MIN", 2026, 1, "R0", "2026-09-30", "2026-09-30", "Internal", "Internal", "Management meeting - September", None, st="Completed", own=OWNER, upd="2026-09-30"),
        R("DEC", 2026, 1, "R0", "2026-09-30", "2026-09-30", "Internal", "Internal", "Decision - supplier consolidation", None, st="Completed", own=OWNER, upd="2026-09-30"),
        R("INC", 2026, 1, "R0", "2026-10-04", "", "Internal", "Internal", "Water leak in storeroom", None, st="Under Review", own=OWNER, due="2026-10-09", upd="2026-10-04"),
    ]


# ---------------------------------------------------------------------------------------
# XML helpers (TRANSACTION REGISTER sheet only)
# ---------------------------------------------------------------------------------------
def cell(row_el, ref):
    for c in row_el:
        if c.get("r") == ref:
            return c
    raise KeyError(ref)


def clear(c):
    for ch in list(c):
        c.remove(ch)
    if "t" in c.attrib:
        del c.attrib["t"]


def put_text(c, text):
    clear(c)
    if text is None or text == "":
        return
    c.set("t", "inlineStr")
    is_ = etree.SubElement(c, X + "is")
    t = etree.SubElement(is_, X + "t")
    t.text = text


def put_num(c, value):
    clear(c)
    if value is None or value == "":
        return
    v = etree.SubElement(c, X + "v")
    f = float(value)
    v.text = str(int(f)) if f.is_integer() else repr(f)


def put_cached(c, value, numeric=False):
    """Keep <f>, add the cached <v> Excel/LibreOffice would store."""
    for v in c.findall(X + "v"):
        c.remove(v)
    if "t" in c.attrib:
        del c.attrib["t"]
    v = etree.SubElement(c, X + "v")
    if numeric and value != "":
        v.text = str(value)
    else:
        c.set("t", "str")
        v.text = value


def alert_for(status, due_dt, as_of, dup):
    """Exactly the BK-SYS-005 'Alert' formula."""
    if dup:
        return "STOP — DUPLICATE"
    if status in CLOSED:
        return "Closed"
    if due_dt is None:
        return "No due date"
    q = (due_dt - as_of).days
    return "OVERDUE" if q < 0 else "DUE SOON" if q <= 7 else "Open"


def compose_id(r):
    """Company Code-Type-Year-Sequence, '' when any part is missing (the E-column formula)."""
    code = r.get("code", CODE)
    if not (code and r["type"] and r["year"] not in ("", None) and r["seq"] not in ("", None)):
        return ""
    return "%s-%s-%04d-%04d" % (code, r["type"], int(r["year"]), int(r["seq"]))


def is_iso(s):
    return isinstance(s, str) and re.match(r"\d{4}-\d{2}-\d{2}$", s) is not None


def write_register(instance, rows, out_path, as_of, cached=True, header_amount_rename=None):
    """rows: list of dicts (or None for an empty row), written from row 7 downward."""
    src = Path(instance) / "02_Registers_and_Controls" / "BK-SYS-005_Smart_Transaction_Register.xlsx"
    with ZipFile(src) as z:
        sheet = etree.fromstring(z.read("xl/worksheets/sheet3.xml"))
        table = z.read("xl/tables/table1.xml")
        rowmap = {int(r.get("r")): r for r in sheet.find(X + "sheetData")}
        shown_ids = [("" if r is None else r.get("cached_id", compose_id(r))) for r in rows]
        counts = {}
        for s in shown_ids:
            if s:
                counts[s] = counts.get(s, 0) + 1
        for i, r_ in enumerate(rows):
            rn = FIRST_ROW + i
            row_el = rowmap[rn]
            shown = shown_ids[i]
            if r_ is None:
                status, due_dt = "", None
                for col in "BCDGHIJKLNOPSTUVW":
                    clear(cell(row_el, "%s%d" % (col, rn)))
                put_text(cell(row_el, "A%d" % rn), CODE)
                put_text(cell(row_el, "F%d" % rn), "R0")
                put_text(cell(row_el, "M%d" % rn), "MYR")
            else:
                status = r_["status"]
                due_dt = d(r_["due"]) if is_iso(r_["due"]) else None
                put_text(cell(row_el, "A%d" % rn), r_.get("code", CODE))
                put_text(cell(row_el, "B%d" % rn), r_["type"])
                put_num(cell(row_el, "C%d" % rn), r_["year"])
                put_num(cell(row_el, "D%d" % rn), r_["seq"])
                put_text(cell(row_el, "F%d" % rn), r_["rev"])
                for col, key in (("G", "reserved"), ("H", "issued"), ("V", "updated")):
                    c = cell(row_el, "%s%d" % (col, rn))
                    clear(c)
                    if r_[key]:
                        put_num(c, serial(d(r_[key])))
                put_text(cell(row_el, "I%d" % rn), r_["cptype"])
                put_text(cell(row_el, "J%d" % rn), r_["cpname"])
                put_text(cell(row_el, "K%d" % rn), r_["subject"])
                if isinstance(r_["amount"], str):
                    put_text(cell(row_el, "L%d" % rn), r_["amount"])      # deliberately bad (text)
                else:
                    put_num(cell(row_el, "L%d" % rn), r_["amount"])
                put_text(cell(row_el, "M%d" % rn), r_["cur"])
                put_text(cell(row_el, "N%d" % rn), status)
                put_text(cell(row_el, "O%d" % rn), r_["owner"])
                c = cell(row_el, "P%d" % rn)
                clear(c)
                if due_dt:
                    put_num(c, serial(due_dt))
                elif r_["due"]:
                    put_text(c, r_["due"])                                 # deliberately bad (text)
                put_text(cell(row_el, "S%d" % rn), r_["related"])
                put_text(cell(row_el, "T%d" % rn), r_["extref"])
                put_text(cell(row_el, "U%d" % rn), r_["link"])
                put_text(cell(row_el, "W%d" % rn), r_["remarks"])
            dup = bool(shown) and counts.get(shown, 0) > 1
            if cached:
                put_cached(cell(row_el, "E%d" % rn), shown)
                put_cached(cell(row_el, "Q%d" % rn), (due_dt - as_of).days if due_dt else "", numeric=True)
                put_cached(cell(row_el, "R%d" % rn), alert_for(status, due_dt, as_of, dup) if shown else "")
                put_cached(cell(row_el, "X%d" % rn), ("DUPLICATE" if dup else "OK") if shown else "")
            else:
                for col in "EQRX":
                    c = cell(row_el, "%s%d" % (col, rn))
                    for v in c.findall(X + "v"):
                        c.remove(v)
                    if "t" in c.attrib:
                        del c.attrib["t"]
        if header_amount_rename:
            for c in rowmap[6]:
                if c.get("r") == "L6":
                    put_text(c, header_amount_rename)
            table = table.replace(b'name="Amount"', ('name="%s"' % header_amount_rename).encode())
        sheet_bytes = etree.tostring(sheet, xml_declaration=True, encoding="utf-8")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with ZipFile(out_path, "w", ZIP_DEFLATED, compresslevel=9) as zo:
            for info in z.infolist():
                data = z.read(info.filename)
                if info.filename == "xl/worksheets/sheet3.xml":
                    data = sheet_bytes
                elif info.filename == "xl/tables/table1.xml":
                    data = table
                zo.writestr(info, data)


# ---------------------------------------------------------------------------------------
# Scenarios: mutation + hand-written expected outcomes (independent of any implementation)
# ---------------------------------------------------------------------------------------
def find(rows, t, y, s):
    for i, r in enumerate(rows):
        if r and r["type"] == t and r["year"] == y and r["seq"] == s:
            return i
    raise KeyError((t, y, s))


def mut_status_update(rows):
    rows[find(rows, "QT", 2026, 4)].update(status="Accepted", updated="2026-10-05", remarks="Customer accepted by email 5 Oct")


def mut_revision(rows):
    rows[find(rows, "QT", 2026, 3)].update(rev="R1", amount=4750, due="2026-10-15", issued="2026-10-05", updated="2026-10-05", remarks="R1 reduced price, validity extended")


def mut_conflict_same_rev(rows):
    rows[find(rows, "QT", 2026, 6)].update(amount=9350)          # commercial field changed, revision unchanged


def mut_backwards_and_reopen(rows):
    rows[find(rows, "QT", 2026, 7)].update(rev="R0")             # revision going backwards
    rows[find(rows, "QT", 2026, 8)].update(status="Draft")       # Cancelled row reopened


def mut_row_missing(rows):
    rows[find(rows, "PO", 2026, 2)] = None                       # row cleared in the register


def mut_rejects(rows):
    def newrow(n, **kw):
        base = R("QT", 2026, n, "R0", "2026-10-05", "", "Customer", "Sample Customer", "Reject test", 1000, st="Draft", own=SALES, upd="2026-10-05")
        base.update(kw)
        return base
    rows.extend([
        newrow(50, code="ABC", subject="Wrong company code"),
        newrow(51, type="XYZ", subject="Unknown document type"),
        newrow(52, status="Pending", subject="Status not in controlled list"),
        newrow(53, amount="RM 1,200 approx", subject="Amount is text"),
        newrow(54, cached_id="NEX-QT-2026-0099", subject="Cached ID overtyped (does not match parts)"),
        newrow(55, seq="", subject="Type set but sequence missing"),
        newrow(56, due="next Friday", subject="Expiry date is text"),
        newrow(57, cur="RM", subject="Currency not in controlled list"),
    ])


N_BASE = len(baseline_rows())
REJ0 = FIRST_ROW + N_BASE   # first appended row number in register_07


SCENARIOS = [
    ("register_02_status_update", "QT-0004 status Issued->Accepted (tracking field, same revision)", mut_status_update, {},
     {tid("QT", 2026, 4): ("UPDATED", ["status", "remarks", "last_updated"])}),
    ("register_03_revision", "QT-0003 revision R0->R1 with a commercial change", mut_revision, {},
     {tid("QT", 2026, 3): ("REVISED", ["revision", "amount", "expiry_due", "date_issued", "last_updated", "remarks"])}),
    ("register_04_conflict_same_revision", "QT-0006 amount changed but revision stays R0", mut_conflict_same_rev, {},
     {tid("QT", 2026, 6): ("CONFLICT", ["SAME_REVISION_COMMERCIAL_CHANGE:amount"])}),
    ("register_05_conflict_backwards_and_reopen", "QT-0007 revision R1->R0; QT-0008 Cancelled->Draft", mut_backwards_and_reopen, {},
     {tid("QT", 2026, 7): ("CONFLICT", ["REVISION_BACKWARDS"]), tid("QT", 2026, 8): ("CONFLICT", ["TERMINAL_STATUS_REOPENED"])}),
    ("register_06_row_missing", "PO-0002 row cleared from the register", mut_row_missing, {},
     {tid("PO", 2026, 2): ("ROW_MISSING", ["ROW_NOT_IN_SOURCE"])}),
    ("register_07_rejects", "Eight invalid new rows appended (per-row reasons)", mut_rejects, {},
     {"ROW %d" % (REJ0 + 0): ("REJECTED", ["COMPANY_CODE_MISMATCH"]),
      "ROW %d" % (REJ0 + 1): ("REJECTED", ["UNKNOWN_DOCUMENT_TYPE"]),
      "ROW %d" % (REJ0 + 2): ("REJECTED", ["INVALID_STATUS"]),
      "ROW %d" % (REJ0 + 3): ("REJECTED", ["INVALID_AMOUNT"]),
      "ROW %d" % (REJ0 + 4): ("REJECTED", ["ID_MISMATCH_CACHED_VS_PARTS"]),
      "ROW %d" % (REJ0 + 5): ("REJECTED", ["INCOMPLETE_ID"]),
      "ROW %d" % (REJ0 + 6): ("REJECTED", ["INVALID_DATE"]),
      "ROW %d" % (REJ0 + 7): ("REJECTED", ["INVALID_CURRENCY"])}),
]

SALES_T = "01_Controlled_Documents/02_Sales_Customer/"
PROC_T = "01_Controlled_Documents/03_Procurement_Supplier/"
FIN_T = "01_Controlled_Documents/04_Finance_Accounts/"
HR_T = "01_Controlled_Documents/05_HR_Administration/"
SAMPLE_FILES = [
    ("NEX-QT-2026-0001_R0_Alpha-Tech-Resources.xlsx", SALES_T + "BK-SAL-001_Quotation.xlsx", tid("QT", 2026, 1), "R0", "MATCH_BY_ID: first document revision R0; superseded when the R1 file is added"),
    ("NEX-QT-2026-0001_R1_Alpha-Tech-Resources.xlsx", SALES_T + "BK-SAL-001_Quotation.xlsx", tid("QT", 2026, 1), "R1", "MATCH_BY_ID: new content hash -> new document revision R1, R0 superseded"),
    ("NEX-SO-2026-0001_Alpha-Tech-Resources.xlsx", SALES_T + "BK-SAL-002_Sales_Order.xlsx", tid("SO", 2026, 1), "R0", "MATCH_BY_ID"),
    ("NEX-DO-2026-0001_Alpha-Tech-Resources.xlsx", SALES_T + "BK-SAL-003_Delivery_Order.xlsx", tid("DO", 2026, 1), "R0", "MATCH_BY_ID"),
    ("NEX-INV-2026-0001_Alpha-Tech-Resources.xlsx", SALES_T + "BK-SAL-004_Invoice.xlsx", tid("INV", 2026, 1), "R0", "MATCH_BY_ID"),
    ("NEX-INV-2026-0002_Beta-Mart.xlsx", SALES_T + "BK-SAL-004_Invoice.xlsx", tid("INV", 2026, 2), "R0", "MATCH_BY_ID (overdue invoice)"),
    ("NEX-RC-2026-0001_Alpha-Tech-Resources.xlsx", SALES_T + "BK-SAL-005_Receipt.xlsx", tid("RC", 2026, 1), "R0", "MATCH_BY_ID"),
    ("NEX-PO-2026-0001_PaperPlus-Trading.xlsx", PROC_T + "BK-PRO-004_Purchase_Order.xlsx", tid("PO", 2026, 1), "R0", "MATCH_BY_ID"),
    ("NEX-GRN-2026-0001_PaperPlus-Trading.xlsx", PROC_T + "BK-PRO-005_Goods_Received_Note.xlsx", tid("GRN", 2026, 1), "R0", "MATCH_BY_ID"),
    ("NEX-BR-2026-0002_Bank_Reconciliation.xlsx", FIN_T + "BK-FIN-004_Bank_Reconciliation.xlsx", tid("BR", 2026, 2), "R0", "MATCH_BY_ID"),
    ("NEX-BR-2026-0002_bank_statement_2026-09.csv", None, tid("BR", 2026, 2), "R0", "MATCH_BY_ID; bank statement input for the FAO-11 bank slot (CE-S3)"),
    ("NEX-EMP-2026-0001_Offer_Letter.docx", HR_T + "BK-HR-002_Offer_Letter.docx", tid("EMP", 2026, 1), "R0", "MATCH_BY_ID; HR module: metadata + SHA-256 only under the default content policy (content NOT stored)"),
    ("NEX-QT-2026-0099_R0_Orphan.xlsx", SALES_T + "BK-SAL-001_Quotation.xlsx", None, "R0", "ORPHAN_ID: name carries NEX-QT-2026-0099, which is not in the register -> listed for manual link, never auto-created"),
    ("Supplier_price_list_misc.xlsx", SALES_T + "BK-SAL-001_Quotation.xlsx", None, "R0", "UNMATCHED: no Transaction ID in the name -> listed for manual linking"),
]


def bank_statement_csv():
    out = io.StringIO()
    w = csv.writer(out, lineterminator="\n")
    w.writerow(["Date", "Description", "Reference", "Debit", "Credit", "Balance"])
    bal = 41250.00
    w.writerow(["2026-09-01", "Opening balance", "", "", "", "%.2f" % bal])
    items = [
        ("2026-09-02", "Customer receipt - Alpha Tech Resources", "RC-0001", 0, 18400.00), ("2026-09-03", "Supplier payment - PaperPlus Trading", "PV-0001", 2850.00, 0),
        ("2026-09-05", "Bank charges", "CHG", 15.00, 0), ("2026-09-08", "Courier", "PCV-0001", 85.00, 0),
        ("2026-09-10", "Customer receipt - Gamma Learning Centre", "TT-7731", 0, 2100.00), ("2026-09-12", "Utilities", "DD-0912", 640.20, 0),
        ("2026-09-15", "Salary run (synthetic)", "SAL-SEP", 9800.00, 0), ("2026-09-17", "Customer receipt - Delta Clinic", "TT-7790", 0, 3300.00),
        ("2026-09-19", "Insurance", "DD-0919", 410.00, 0), ("2026-09-22", "Supplier payment - Omega Stationery", "CHQ-1042", 1200.00, 0),
        ("2026-09-24", "Customer receipt - Epsilon Logistics", "TT-7812", 0, 5600.00), ("2026-09-26", "Unidentified deposit", "DEP-0926", 0, 750.00),
        ("2026-09-29", "Interest", "INT", 0, 12.40), ("2026-09-30", "Bank charges", "CHG", 15.00, 0),
    ]
    for dt, desc, ref, deb, cre in items:
        bal += cre - deb
        w.writerow([dt, desc, ref, "%.2f" % deb if deb else "", "%.2f" % cre if cre else "", "%.2f" % bal])
    return out.getvalue().encode("utf-8")


def tweak_office(data, tag):
    """Byte-different copy of an OOXML file so revisions/orphans hash differently."""
    zin = ZipFile(io.BytesIO(data))
    buf = io.BytesIO()
    with ZipFile(buf, "w", ZIP_DEFLATED) as zo:
        for info in zin.infolist():
            zo.writestr(info, zin.read(info.filename))
        zo.writestr("docProps/fixture-note.txt", tag)
    return buf.getvalue()


def sha256(b):
    return hashlib.sha256(b).hexdigest()


def build_master_control(instance, out_path):
    import openpyxl
    wb = openpyxl.load_workbook(Path(instance) / "02_Registers_and_Controls" / "BK-SYS-003_Master_Control_Workbook.xlsx")
    ws = wb["Approval Limits"]
    data = {
        4: (5000, "Procurement Manager", 25000, "Finance Manager", "Owner / Board"),
        5: (3000, "Finance Manager", 20000, "Authorised Manager", "Owner / Board"),
        6: (10000, "Sales Manager", 50000, "Authorised Manager", "Owner / Board"),
        7: ("5%", "Sales Manager", "10%", "Authorised Manager", "Owner / Board"),   # percent text on purpose
        8: (1000, "Operations Manager", 5000, "Authorised Manager", "Owner / Board"),
    }
    for r, (l1, a1, l2, a2, above) in data.items():
        ws.cell(r, 2, l1)
        ws.cell(r, 3, a1)
        ws.cell(r, 4, l2)
        ws.cell(r, 5, a2)
        ws.cell(r, 6, above)
    wb.save(out_path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--instance", required=True)
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent))
    ap.add_argument("--as-of", default="2026-10-05")
    a = ap.parse_args()
    out = Path(a.out)
    as_of = d(a.as_of)
    inst = Path(a.instance)

    base = baseline_rows()
    for old in out.glob("register_*.xlsx"):
        old.unlink()
    write_register(inst, base, out / "register_01_baseline.xlsx", as_of)

    seen = {}
    for i, r in enumerate(base):
        seen.setdefault(tid(r["type"], r["year"], r["seq"]), []).append(FIRST_ROW + i)
    per_row = {}
    for i, r in enumerate(base):
        t = tid(r["type"], r["year"], r["seq"])
        rn = FIRST_ROW + i
        if len(seen[t]) > 1:
            per_row[str(rn)] = {"transaction_id": t, "outcome": "REJECTED", "reasons": ["DUPLICATE_ID_IN_FILE"]}
        else:
            e = {"transaction_id": t, "outcome": "CREATED", "reasons": []}
            if t == tid("DO", 2026, 3):
                e["warnings"] = ["RELATED_NOT_FOUND:" + tid("SO", 2026, 3)]
            if t == tid("GRN", 2026, 2):
                e["warnings"] = ["CHAIN_MISSING_PREDECESSOR:PO"]
            per_row[str(rn)] = e
    created = sum(1 for v in per_row.values() if v["outcome"] == "CREATED")
    rejected = len(per_row) - created
    expected = {"as_of": a.as_of, "company_code": CODE, "register_sheet": "TRANSACTION REGISTER", "header_row": 6, "first_data_row": FIRST_ROW, "files": {}}
    expected["files"]["register_01_baseline.xlsx"] = {
        "description": "Baseline import into an empty firm", "rows": len(base),
        "counts": {"CREATED": created, "REJECTED": rejected}, "per_row": per_row,
        "reimport_note": "Re-import of the same file: %d valid rows UNCHANGED; the %d duplicate rows are REJECTED again (no state change)." % (created, rejected)}

    for stem, desc, mut, kw, exp in SCENARIOS:
        rows = [dict(r) for r in baseline_rows()]
        mut(rows)
        write_register(inst, rows, out / (stem + ".xlsx"), as_of, **kw)
        expected["files"][stem + ".xlsx"] = {
            "description": desc, "apply_after": "register_01_baseline.xlsx",
            "changed": {k: {"outcome": v[0], "reasons_or_fields": v[1]} for k, v in exp.items()},
            "all_other_valid_rows": "UNCHANGED", "duplicate_rows": "REJECTED (DUPLICATE_ID_IN_FILE) again"}
    write_register(inst, [dict(r) for r in baseline_rows()], out / "register_08_no_cached_values.xlsx", as_of, cached=False)
    expected["files"]["register_08_no_cached_values.xlsx"] = {
        "description": "Same content as the baseline, saved the way BizKick ships it: formulas WITHOUT cached values. The importer must compose the Transaction ID from Company Code-Type-Year-Sequence.",
        "apply_after": "register_01_baseline.xlsx", "all_other_valid_rows": "UNCHANGED", "duplicate_rows": "REJECTED again",
        "also": "Imported alone into an empty firm it must produce exactly the baseline outcomes."}
    write_register(inst, [dict(r) for r in baseline_rows()], out / "register_09_header_changed.xlsx", as_of, header_amount_rename="Total")
    expected["files"]["register_09_header_changed.xlsx"] = {
        "description": "Header cell L6 renamed 'Amount' -> 'Total' (customer changed the register structure)",
        "file_level_outcome": "REJECTED", "reason": "STRUCTURE_CHANGED:Amount", "rows_processed": 0}

    build_master_control(inst, out / "NEX_BK-SYS-003_Master_Control_Workbook.xlsx")

    sf = out / "sample_files"
    if sf.exists():
        shutil.rmtree(sf)
    sf.mkdir(parents=True)
    manifest = []
    for name, tpl, match, rev, expectation in SAMPLE_FILES:
        if tpl is None:
            data = bank_statement_csv()
        else:
            data = (inst / tpl).read_bytes()
            if rev != "R0" or "Orphan" in name or "misc" in name:
                data = tweak_office(data, "fixture:" + name)
        (sf / name).write_bytes(data)
        manifest.append({"file": name, "sha256": sha256(data), "bytes": len(data), "transaction_id": match, "revision": rev, "expectation": expectation})
    (sf / "manifest.json").write_text(json.dumps({"synthetic": True, "files": manifest}, indent=2) + "\n", encoding="utf-8")

    alerts = {}
    for r in base:
        t = tid(r["type"], r["year"], r["seq"])
        al = alert_for(r["status"], d(r["due"]) if r["due"] else None, as_of, len(seen[t]) > 1)
        alerts.setdefault(al, set()).add(t)
    expected["workbook_alert_values_at_as_of"] = {k: sorted(v) for k, v in alerts.items()}
    expected["rule_inputs_at_as_of"] = {
        "quotation_expiring_within_7_days_status_issued": [tid("QT", 2026, 3), tid("QT", 2026, 7)],
        "invoice_overdue_not_closed": [tid("INV", 2026, 2)],
        "bank_reconciliation_draft_with_statement": [tid("BR", 2026, 2)],
        "new_employee_record": [tid("EMP", 2026, 1)],
        "grn_without_related_po": [tid("GRN", 2026, 2)],
        "note": "QT-0001/0002 are Accepted with past validity: the workbook Alert shows OVERDUE, but quotation-expiry rules must act only on Issued/Under Review quotations."}
    expected["transaction_chains"] = {
        "sales_complete": [tid("QT", 2026, 1), tid("SO", 2026, 1), tid("DO", 2026, 1), tid("INV", 2026, 1), tid("RC", 2026, 1)],
        "sales_open_invoice": [tid("QT", 2026, 2), tid("SO", 2026, 2), tid("DO", 2026, 2), tid("INV", 2026, 2)],
        "quotation_replacement": [tid("QT", 2026, 5), tid("QT", 2026, 6)],
        "procurement_complete": [tid("PR", 2026, 1), tid("RFQ", 2026, 1), tid("QC", 2026, 1), tid("PO", 2026, 1), tid("GRN", 2026, 1), tid("PV", 2026, 1)],
        "missing_links": {tid("GRN", 2026, 2): "no related PO", tid("DO", 2026, 3): "related SO-2026-0003 not in register"}}
    (out / "expected_outcomes.json").write_text(json.dumps(expected, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("built %d baseline rows (%d CREATED / %d REJECTED expected) in %s" % (len(base), created, rejected, out))


if __name__ == "__main__":
    main()
