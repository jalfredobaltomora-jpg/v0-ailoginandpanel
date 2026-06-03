#!/usr/bin/env python3
"""
Export Control Administrative - Professional Excel Report
==========================================================
Uses xlsxwriter to generate a print-ready .xlsx with:
- add_table (filters + zebra striping)
- Dark blue header (#1f4e78) white bold centered text
- Percentage (0.00%%) for Failure Rate %%, Def Rate %%
- Thousands separator for Audits, Failures, Qty
- Conditional formatting: FAIL -> red, PASS -> green
- Page setup: landscape, fit to 1 page wide, 0.5" margins, header title
- Dynamic column widths

Usage:
  # From a JSON file exported by the system
  python scripts/export_control_administrative.py data.json -o reporte.xlsx

  # Pipe JSON via stdin
  python scripts/export_control_administrative.py -o reporte.xlsx < data.json

  # Use sample data (for testing)
  python scripts/export_control_administrative.py --sample -o reporte.xlsx
"""

import json, sys, argparse
import xlsxwriter


HEADERS = [
    "Fecha", "Fabrica", "Cliente", "Estilo", "PO",
    "Type", "Name", "Stage", "Point",
    "Audits", "Failures", "Failure Rate %",
    "Meas Insp", "Meas Def", "Meas Def Rate %",
    "Vis Insp", "Vis Def", "Vis Def Rate %",
    "Result",
]

# Index of numeric columns (0-based)
IDX_AUDITS = 9
IDX_FAILURES = 10
IDX_FAILURE_RATE = 11
IDX_MEAS_INSP = 12
IDX_MEAS_DEF = 13
IDX_MEAS_DEF_RATE = 14
IDX_VIS_INSP = 15
IDX_VIS_DEF = 16
IDX_VIS_DEF_RATE = 17
IDX_RESULT = 18

TOTAL_LABELS = {"TOTAL ", "Total ", "GRAN TOTAL", " Subtotal ", "  Subtotal "}


def is_subtotal_row(row):
    """Check if row is a subtotal/total marker; returns label type or None."""
    if not row or not row[0]:
        return None
    v = str(row[0])
    for label in TOTAL_LABELS:
        if v.startswith(label) or v == label:
            return label.strip()
    return None


def build_workbook(data_rows, output_path, title="CONTROL ADMINISTRATIVE - BASE DEPURADA"):
    """Create the xlsxwriter workbook with all formatting."""
    wb = xlsxwriter.Workbook(output_path)
    ws = wb.add_worksheet("Base Depurada")

    # Formats
    fmt_header = wb.add_format({
        "bold": True,
        "font_color": "white",
        "bg_color": "#1f4e78",
        "border": 1,
        "border_color": "#a0a0a0",
        "align": "center",
        "valign": "vcenter",
        "text_wrap": True,
        "font_name": "Calibri",
        "font_size": 10,
    })
    fmt_title = wb.add_format({
        "bold": True,
        "font_color": "#1f4e78",
        "bg_color": "#d6e4f0",
        "border": 1,
        "border_color": "#a0a0a0",
        "align": "center",
        "valign": "vcenter",
        "font_name": "Calibri",
        "font_size": 14,
    })
    fmt_pct = wb.add_format({
        "num_format": "0.00%",
        "border": 1,
        "border_color": "#a0a0a0",
        "align": "right",
        "valign": "vcenter",
        "font_name": "Calibri",
        "font_size": 10,
    })
    fmt_int = wb.add_format({
        "num_format": "#,##0",
        "border": 1,
        "border_color": "#a0a0a0",
        "align": "right",
        "valign": "vcenter",
        "font_name": "Calibri",
        "font_size": 10,
    })
    fmt_text = wb.add_format({
        "border": 1,
        "border_color": "#a0a0a0",
        "align": "left",
        "valign": "vcenter",
        "font_name": "Calibri",
        "font_size": 10,
    })
    fmt_text_center = wb.add_format({
        "border": 1,
        "border_color": "#a0a0a0",
        "align": "center",
        "valign": "vcenter",
        "font_name": "Calibri",
        "font_size": 10,
    })

    # Conditional: PASS (green)
    fmt_pass = wb.add_format({
        "bg_color": "#c6efce",
        "font_color": "#006100",
        "bold": True,
        "border": 1,
        "border_color": "#a0a0a0",
        "align": "center",
        "valign": "vcenter",
        "font_name": "Calibri",
        "font_size": 10,
    })
    # Conditional: FAIL (red)
    fmt_fail = wb.add_format({
        "bg_color": "#ffc7ce",
        "font_color": "#9c0006",
        "bold": True,
        "border": 1,
        "border_color": "#a0a0a0",
        "align": "center",
        "valign": "vcenter",
        "font_name": "Calibri",
        "font_size": 10,
    })

    # Alternating row formats (data section)
    fmt_data_even = wb.add_format({
        "bg_color": "#f0f4f8",
        "border": 1,
        "border_color": "#a0a0a0",
        "font_name": "Calibri",
        "font_size": 10,
    })
    fmt_data_odd = wb.add_format({
        "bg_color": "#ffffff",
        "border": 1,
        "border_color": "#a0a0a0",
        "font_name": "Calibri",
        "font_size": 10,
    })

    # Subtotal / total formats
    fmt_grand_total = wb.add_format({
        "bold": True,
        "font_color": "#ffffff",
        "bg_color": "#1e3a8a",
        "border": 1,
        "border_color": "#a0a0a0",
        "font_name": "Calibri",
        "font_size": 11,
    })
    fmt_month_total = wb.add_format({
        "bold": True,
        "font_color": "#dbeafe",
        "bg_color": "#1e40af",
        "border": 1,
        "border_color": "#a0a0a0",
        "font_name": "Calibri",
        "font_size": 10,
    })
    fmt_factory_total = wb.add_format({
        "bold": True,
        "font_color": "#d1fae5",
        "bg_color": "#065f46",
        "border": 1,
        "border_color": "#a0a0a0",
        "font_name": "Calibri",
        "font_size": 10,
    })
    fmt_buyer_subtotal = wb.add_format({
        "bold": True,
        "font_color": "#fef3c7",
        "bg_color": "#92400e",
        "border": 1,
        "border_color": "#a0a0a0",
        "font_name": "Calibri",
        "font_size": 10,
    })
    fmt_point_subtotal = wb.add_format({
        "bold": True,
        "font_color": "#ede9fe",
        "bg_color": "#5b21b6",
        "border": 1,
        "border_color": "#a0a0a0",
        "font_name": "Calibri",
        "font_size": 10,
    })

    # Write title row
    title_row = 0
    ws.merge_range(title_row, 0, title_row, len(HEADERS) - 1, title, fmt_title)
    ws.set_row(title_row, 30)

    # Column widths (dynamic estimate)
    col_widths = []
    for i, h in enumerate(HEADERS):
        max_w = len(h.encode("utf-8")) if h else 10
        for row in data_rows:
            val = str(row[i]) if i < len(row) and row[i] is not None else ""
            w = len(val.encode("utf-8"))
            if w > max_w:
                max_w = w
        clamped = max(min(max_w + 3, 40), 10)
        col_widths.append(clamped)
    for i, w in enumerate(col_widths):
        ws.set_column(i, i, w)

    # Write header row (row 1)
    header_row = 1
    for c, h in enumerate(HEADERS):
        ws.write(header_row, c, h, fmt_header)
    ws.set_row(header_row, 28)

    # Write data rows (starting row 2)
    data_start_row = header_row + 1
    last_data_row = data_start_row + len(data_rows) - 1

    for ri, row_data in enumerate(data_rows):
        excel_row = data_start_row + ri
        st = is_subtotal_row(row_data)

        # Pick format for the entire row based on subtotal type
        if st == "GRAN TOTAL":
            row_fmt_base = fmt_grand_total
            pct_fmt = fmt_grand_total
            int_fmt = fmt_grand_total
            text_fmt = fmt_grand_total
        elif st == "TOTAL" or (row_data[0] and str(row_data[0]).startswith("TOTAL ")):
            row_fmt_base = fmt_month_total
            pct_fmt = fmt_month_total
            int_fmt = fmt_month_total
            text_fmt = fmt_month_total
        elif row_data[0] and str(row_data[0]).startswith("Total "):
            row_fmt_base = fmt_factory_total
            pct_fmt = fmt_factory_total
            int_fmt = fmt_factory_total
            text_fmt = fmt_factory_total
        elif row_data[0] and " Subtotal " in str(row_data[0]):
            row_fmt_base = fmt_buyer_subtotal
            pct_fmt = fmt_buyer_subtotal
            int_fmt = fmt_buyer_subtotal
            text_fmt = fmt_buyer_subtotal
        elif row_data[0] and "  Subtotal " in str(row_data[0]):
            row_fmt_base = fmt_point_subtotal
            pct_fmt = fmt_point_subtotal
            int_fmt = fmt_point_subtotal
            text_fmt = fmt_point_subtotal
        else:
            is_even = ri % 2 == 0
            row_fmt_base = fmt_data_even if is_even else fmt_data_odd
            pct_fmt = row_fmt_base
            int_fmt = row_fmt_base
            text_fmt = row_fmt_base

        for c in range(len(HEADERS)):
            val = row_data[c] if c < len(row_data) else ""

            # Determine which format to use per cell
            if c == IDX_RESULT:
                if str(val).strip().upper() == "PASS":
                    ws.write(excel_row, c, val, fmt_pass)
                elif str(val).strip().upper() == "FAIL":
                    ws.write(excel_row, c, val, fmt_fail)
                else:
                    ws.write(excel_row, c, val, fmt_text_center)
            elif c in (IDX_FAILURE_RATE, IDX_MEAS_DEF_RATE, IDX_VIS_DEF_RATE):
                # Expect value as decimal (e.g. 0.10 for 10%)
                if isinstance(val, str) and val.endswith("%"):
                    val = float(val.replace("%", "")) / 100.0
                ws.write_number(excel_row, c, float(val or 0), pct_fmt)
            elif c in (IDX_AUDITS, IDX_FAILURES, IDX_MEAS_INSP, IDX_MEAS_DEF, IDX_VIS_INSP, IDX_VIS_DEF):
                ws.write_number(excel_row, c, int(val or 0), int_fmt)
            else:
                ws.write(excel_row, c, val, text_fmt)

    # add_table - creates proper Excel table with filters, banded rows, sortable headers
    table_range = "A{}:{}{}".format(header_row + 1, chr(65 + len(HEADERS) - 1), last_data_row + 1)
    ws.add_table(table_range, {
        "header_row": True,
        "banded_rows": True,
        "style": "Table Style Medium 9",
    })

    # Conditional formatting for Result column
    result_col_letter = chr(65 + IDX_RESULT) if IDX_RESULT < 26 else None
    if result_col_letter:
        result_range = "{}{}:{}{}".format(result_col_letter, data_start_row + 1, result_col_letter, last_data_row + 1)
        ws.conditional_format(result_range, {
            "type": "cell",
            "criteria": "equal to",
            "value": '"FAIL"',
            "format": fmt_fail,
        })
        ws.conditional_format(result_range, {
            "type": "cell",
            "criteria": "equal to",
            "value": '"PASS"',
            "format": fmt_pass,
        })

    # Page setup for printing
    ws.set_landscape()
    ws.set_paper(1)  # Letter
    ws.fit_to_pages(1, 0)  # 1 page wide, tall as needed
    ws.set_margins(left=0.5, right=0.5, top=0.5, bottom=0.5)
    ws.set_header("&C&B&14{}".format(title))
    ws.set_footer("&P / &N")
    ws.center_horizontally()
    ws.print_area(0, 0, last_data_row, len(HEADERS) - 1)

    wb.close()
    print("Report exported: " + output_path)


def generate_sample_data():
    """Generate sample data for testing."""
    import datetime, random

    rows = []
    factories = ["SAE-A TECHNOTEX, S.A(1)", "SAE-A TECHNOTEX, S.A(2)", "EINS, S.A.(2)"]
    buyers = ["NIKE", "ADIDAS", "PUMA", "UNDER ARMOUR"]
    stages = ["CUTTING", "SEWING", "PACKING"]
    points = ["IN-LINE", "FINAL", "RANDOM"]
    results = ["PASS", "FAIL"]

    for f in factories:
        for b in buyers:
            for s in stages:
                for p in points:
                    audits = random.randint(50, 500)
                    failures = random.randint(0, int(audits * 0.3))
                    meas_insp = random.randint(20, 200)
                    meas_def = random.randint(0, int(meas_insp * 0.2))
                    vis_insp = random.randint(20, 200)
                    vis_def = random.randint(0, int(vis_insp * 0.2))
                    failure_rate = failures / audits if audits > 0 else 0
                    meas_def_rate = meas_def / meas_insp if meas_insp > 0 else 0
                    vis_def_rate = vis_def / vis_insp if vis_insp > 0 else 0
                    result = "PASS" if random.random() > 0.3 else "FAIL"

                    rows.append({
                        "fecha": datetime.date(2025, random.randint(1, 12), random.randint(1, 28)).isoformat(),
                        "factory": f, "buyer": b, "style": "STY-" + str(random.randint(1000, 9999)),
                        "po": "PO-" + str(random.randint(10000, 99999)), "colL": "FABRIC", "colM": "",
                        "stage": s, "point": p,
                        "audits": audits, "failures": failures, "failureRate": failure_rate,
                        "measIns": meas_insp, "measDef": meas_def, "measDefRate": meas_def_rate,
                        "visIns": vis_insp, "visDef": vis_def, "visDefRate": vis_def_rate,
                        "result": result, "mesFiltroKey": "", "mesTexto": "",
                    })

    return rows


def data_to_rows(records):
    """Convert list of dicts (as from the system) to row arrays with subtotals."""
    rows = []
    L = len([
        "Fecha", "Fabrica", "Cliente", "Estilo", "PO",
        "Type", "Name", "Stage", "Point"
    ])

    def a0():
        return {"audits": 0, "failures": 0, "measIns": 0, "measDef": 0, "visIns": 0, "visDef": 0}

    def add_agg(t, s):
        t["audits"] += s["audits"]
        t["failures"] += s["failures"]
        t["measIns"] += s["measIns"]
        t["measDef"] += s["measDef"]
        t["visIns"] += s["visIns"]
        t["visDef"] += s["visDef"]

    def make_sub_row(agg, label):
        fr = agg["failures"] / agg["audits"] if agg["audits"] > 0 else 0
        mr = agg["measDef"] / agg["measIns"] if agg["measIns"] > 0 else 0
        vr = agg["visDef"] / agg["visIns"] if agg["visIns"] > 0 else 0
        return [label, "", "", "", "", "", "", "", "",
                agg["audits"], agg["failures"], fr,
                agg["measIns"], agg["measDef"], mr,
                agg["visIns"], agg["visDef"], vr, ""]

    def dr(r):
        fr = r["failures"] / r["audits"] if r["audits"] > 0 else 0
        mr = r["measDef"] / r["measIns"] if r["measIns"] > 0 else 0
        vr = r["visDef"] / r["visIns"] if r["visIns"] > 0 else 0
        return [r["fecha"], r["factory"], r["buyer"], r["style"], r["po"],
                r.get("colL", ""), r.get("colM", ""), r["stage"], r["point"],
                r["audits"], r["failures"], fr,
                r["measIns"], r["measDef"], mr,
                r["visIns"], r["visDef"], vr, r["result"]]

    # Group by month -> factory -> buyer -> point
    sorted_recs = sorted(records, key=lambda r: (
        r.get("mesFiltroKey", ""), r.get("factory", ""),
        r.get("buyer", ""), r.get("point", ""), r.get("fecha", "")
    ))

    pm = pf = pb = pp = ""
    am = af = ab = ap = a0()
    gt = a0()

    def fp():
        nonlocal pp, ap, ab
        if pp == "":
            return
        rows.append(make_sub_row(ap, "  Subtotal " + pp))
        add_agg(ab, ap)
        ap = a0()

    def fb():
        nonlocal pb, pp, ap, ab, af
        if pb == "":
            return
        fp()
        rows.append(make_sub_row(ab, " Subtotal " + pb))
        add_agg(af, ab)
        ab = a0()

    def ff():
        nonlocal pf, pb, pp, ap, ab, af, am
        if pf == "":
            return
        fb()
        rows.append(make_sub_row(af, "Total " + pf))
        add_agg(am, af)
        af = a0()

    def fm():
        nonlocal pm, pf, pb, pp, ap, ab, af, am, gt
        if pm == "":
            return
        ff()
        rows.append(make_sub_row(am, "TOTAL " + pm))
        add_agg(gt, am)
        am = a0()

    for r in sorted_recs:
        mk = r.get("mesFiltroKey", "")
        if mk != pm:
            fm()
            pm = mk
            pf = pb = pp = ""
        if r["factory"] != pf:
            ff()
            pf = r["factory"]
            pb = pp = ""
        if r["buyer"] != pb:
            fb()
            pb = r["buyer"]
            pp = ""
        if r["point"] != pp:
            fp()
            pp = r["point"]
        add_agg(ap, r)
        rows.append(dr(r))

    fp()
    fb()
    ff()
    fm()
    rows.append(make_sub_row(gt, "GRAN TOTAL"))

    # Remove empty spacer rows
    rows = [r for r in rows if r]

    return rows


def main():
    parser = argparse.ArgumentParser(
        description="Generate professional Control Administrative Excel report using xlsxwriter"
    )
    parser.add_argument("input", nargs="?", help="JSON input file (omit for stdin)")
    parser.add_argument("-o", "--output", default="control_administrative.xlsx",
                        help="Output .xlsx path")
    parser.add_argument("--sample", action="store_true",
                        help="Use sample data for testing")
    args = parser.parse_args()

    if args.sample:
        records = generate_sample_data()
        print("[INFO] Using sample data")
    elif args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            data = json.load(f)
        records = data if isinstance(data, list) else data.get("entries", data.get("data", []))
        print("[INFO] Loaded {} records from {}".format(len(records), args.input))
    else:
        data = json.load(sys.stdin)
        records = data if isinstance(data, list) else data.get("entries", data.get("data", []))
        print("[INFO] Loaded {} records from stdin".format(len(records)))

    rows = data_to_rows(records)
    print("[INFO] Generated {} rows (including subtotals)".format(len(rows)))
    build_workbook(rows, args.output)


if __name__ == "__main__":
    main()
