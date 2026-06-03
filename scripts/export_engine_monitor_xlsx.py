#!/usr/bin/env python3
"""
Export Engine Monitor - Dark Theme Excel
==========================================
Uses xlsxwriter with dark theme branding:
- Background #0b111b, green headers #00d084, white text
- Conditional formatting: green for low %, red for high %
- Chart image embedded in first sheet
- Print layout: landscape, fit to 1 page wide

Usage:
  python scripts/export_engine_monitor_xlsx.py data.json chart.png -o report.xlsx
  python scripts/export_engine_monitor_xlsx.py --sample -o report.xlsx
"""

import json, sys, argparse, os
import xlsxwriter


HEADERS = [
    "Fecha", "Fabrica", "Cliente", "Estilo", "PO",
    "Stage", "Point",
    "Audits", "Failures", "Failure Rate %",
    "Meas Insp", "Meas Def", "Meas Def Rate %",
    "Vis Insp", "Vis Def", "Vis Def Rate %",
    "Result",
]

IDX = {h: i for i, h in enumerate(HEADERS)}


def build_workbook(records, chart_image_path, output_path, filters=None):
    wb = xlsxwriter.Workbook(output_path)
    ws = wb.add_worksheet("Engine Monitor")

    # Dark background - xlsxwriter doesn't support sheet-level bg,
    # so we color all cells in the range
    fmt_dark_bg = wb.add_format({
        "bg_color": "#0b111b", "font_color": "#8b949e",
        "font_name": "Calibri", "font_size": 10,
        "border": 0,
    })

    # Green header
    fmt_header = wb.add_format({
        "bold": True, "font_color": "white",
        "bg_color": "#00d084", "border": 1, "border_color": "#1a1f2e",
        "align": "center", "valign": "vcenter",
        "text_wrap": True, "font_name": "Calibri", "font_size": 10,
    })

    # Title
    fmt_title = wb.add_format({
        "bold": True, "font_color": "#00d084",
        "bg_color": "#0b111b", "border": 0,
        "align": "center", "valign": "vcenter",
        "font_name": "Calibri", "font_size": 16,
    })

    fmt_subtitle = wb.add_format({
        "bold": False, "font_color": "#8b949e",
        "bg_color": "#0b111b", "border": 0,
        "align": "center", "valign": "vcenter",
        "font_name": "Calibri", "font_size": 9,
    })

    # Data formats
    fmt_pct_good = wb.add_format({
        "num_format": "0.00%",
        "font_color": "#00d084", "bg_color": "#0b111b",
        "border": 1, "border_color": "#1a1f2e",
        "align": "right", "font_name": "Calibri", "font_size": 10,
    })
    fmt_pct_warn = wb.add_format({
        "num_format": "0.00%",
        "font_color": "#f59e0b", "bg_color": "#0b111b",
        "border": 1, "border_color": "#1a1f2e",
        "align": "right", "font_name": "Calibri", "font_size": 10,
    })
    fmt_pct_bad = wb.add_format({
        "num_format": "0.00%",
        "font_color": "#f44336", "bg_color": "#0b111b",
        "border": 1, "border_color": "#1a1f2e",
        "align": "right", "font_name": "Calibri", "font_size": 10,
    })
    fmt_int = wb.add_format({
        "num_format": "#,##0",
        "font_color": "#ffffff", "bg_color": "#0b111b",
        "border": 1, "border_color": "#1a1f2e",
        "align": "right", "font_name": "Calibri", "font_size": 10,
    })
    fmt_text = wb.add_format({
        "font_color": "#c9d1d9", "bg_color": "#0b111b",
        "border": 1, "border_color": "#1a1f2e",
        "align": "left", "font_name": "Calibri", "font_size": 10,
    })
    fmt_text_center = wb.add_format({
        "font_color": "#c9d1d9", "bg_color": "#0b111b",
        "border": 1, "border_color": "#1a1f2e",
        "align": "center", "font_name": "Calibri", "font_size": 10,
    })

    # Result formats
    fmt_pass = wb.add_format({
        "font_color": "#00d084", "bg_color": "#0b3322",
        "bold": True, "border": 1, "border_color": "#1a1f2e",
        "align": "center", "font_name": "Calibri", "font_size": 10,
    })
    fmt_fail = wb.add_format({
        "font_color": "#f44336", "bg_color": "#331111",
        "bold": True, "border": 1, "border_color": "#1a1f2e",
        "align": "center", "font_name": "Calibri", "font_size": 10,
    })

    # Alternating row format (subtle lighter dark)
    fmt_data_even = wb.add_format({
        "font_color": "#c9d1d9", "bg_color": "#111827",
        "border": 1, "border_color": "#1a1f2e",
        "font_name": "Calibri", "font_size": 10,
    })
    fmt_data_odd = wb.add_format({
        "font_color": "#c9d1d9", "bg_color": "#0b111b",
        "border": 1, "border_color": "#1a1f2e",
        "font_name": "Calibri", "font_size": 10,
    })

    # ── Embed chart image (sheet 1, top-left area) ──────────
    row = 0
    if chart_image_path and os.path.exists(chart_image_path):
        ws.insert_image(row, 0, chart_image_path,
                        {"x_scale": 0.55, "y_scale": 0.55,
                         "x_offset": 10, "y_offset": 5,
                         "object_position": 1})
        row = 21  # Move data below chart

    # ── Title ──────────────────────────────────────────────
    title = "ENGINE MONITOR - CONTROL ADMINISTRATIVE"
    ws.merge_range(row, 0, row, len(HEADERS) - 1, title, fmt_title)
    row += 1

    if filters:
        parts = []
        for key, label in [("months", "Meses"), ("factories", "Fabricas"),
                           ("buyers", "Clientes"), ("points", "Points")]:
            vals = filters.get(key, [])
            if vals and len(vals) < 10:
                parts.append(f"{label}: {', '.join(vals[:5])}")
            elif vals:
                parts.append(f"{label}: {len(vals)} seleccionados")
        if parts:
            ws.merge_range(row, 0, row, len(HEADERS) - 1, " | ".join(parts), fmt_subtitle)
            row += 1

    row += 1  # spacer
    header_row = row

    # ── Column widths ──────────────────────────────────────
    col_widths = []
    for i, h in enumerate(HEADERS):
        max_w = len(h)
        for rec in records:
            val = str(rec.get(h.lower().replace(" ", "_").replace("%", "").replace(".", ""), ""))
            w = len(val)
            if w > max_w:
                max_w = w
        col_widths.append(max(min(max_w + 3, 35), 10))
    for i, w in enumerate(col_widths):
        ws.set_column(i, i, w)

    # ── Header row ─────────────────────────────────────────
    for c, h in enumerate(HEADERS):
        ws.write(header_row, c, h, fmt_header)
    ws.set_row(header_row, 26)

    # ── Data rows ──────────────────────────────────────────
    data_start_row = header_row + 1
    for ri, rec in enumerate(records):
        excel_row = data_start_row + ri
        is_even = ri % 2 == 0
        base_fmt = fmt_data_even if is_even else fmt_data_odd

        vals = [
            rec.get("fecha", ""), rec.get("factory", ""), rec.get("buyer", ""),
            rec.get("style", ""), rec.get("po", ""),
            rec.get("stage", ""), rec.get("point", ""),
            rec.get("audits", 0), rec.get("failures", 0),
            rec.get("failureRate", 0),
            rec.get("measIns", 0), rec.get("measDef", 0), rec.get("measDefRate", 0),
            rec.get("visIns", 0), rec.get("visDef", 0), rec.get("visDefRate", 0),
            rec.get("result", ""),
        ]

        for c in range(len(HEADERS)):
            val = vals[c]
            h_name = HEADERS[c]

            if h_name == "Result":
                sval = str(val).strip().upper()
                if sval == "PASS":
                    ws.write(excel_row, c, val, fmt_pass)
                elif sval == "FAIL":
                    ws.write(excel_row, c, val, fmt_fail)
                else:
                    ws.write(excel_row, c, val, fmt_text_center)
            elif h_name in ("Failure Rate %", "Meas Def Rate %", "Vis Def Rate %"):
                if isinstance(val, str) and val.endswith("%"):
                    val = float(val.replace("%", "")) / 100.0
                fval = float(val or 0)
                # Conditional coloring: green < 5%, amber < 15%, red >= 15%
                pct_val = fval * 100 if fval < 1 else fval
                if pct_val < 5:
                    ws.write_number(excel_row, c, fval, fmt_pct_good)
                elif pct_val < 15:
                    ws.write_number(excel_row, c, fval, fmt_pct_warn)
                else:
                    ws.write_number(excel_row, c, fval, fmt_pct_bad)
            elif h_name in ("Audits", "Failures", "Meas Insp", "Meas Def", "Vis Insp", "Vis Def"):
                ws.write_number(excel_row, c, int(val or 0), fmt_int)
            else:
                ws.write(excel_row, c, val, fmt_text)

    last_data_row = data_start_row + len(records) - 1

    # ── add_table ──────────────────────────────────────────
    last_col = chr(65 + len(HEADERS) - 1)
    table_range = f"{last_col}{header_row + 1}:A{last_data_row + 1}"
    table_range = f"A{header_row + 1}:{last_col}{last_data_row + 1}"
    ws.add_table(table_range, {
        "header_row": True,
        "banded_rows": False,
        "style": "Table Style Dark 11",
    })

    # Conditional formatting for percentages
    for col_name in ("Failure Rate %", "Meas Def Rate %", "Vis Def Rate %"):
        ci = IDX[col_name]
        col_letter = chr(65 + ci)
        rng = f"{col_letter}{data_start_row + 1}:{col_letter}{last_data_row + 1}"
        ws.conditional_format(rng, {
            "type": "cell",
            "criteria": "less than",
            "value": 0.05,
            "format": fmt_pct_good,
        })
        ws.conditional_format(rng, {
            "type": "cell",
            "criteria": "between",
            "minimum": 0.05,
            "maximum": 0.15,
            "format": fmt_pct_warn,
        })
        ws.conditional_format(rng, {
            "type": "cell",
            "criteria": "greater than or equal to",
            "value": 0.15,
            "format": fmt_pct_bad,
        })

    # Conditional formatting for Result
    result_ci = IDX["Result"]
    result_cl = chr(65 + result_ci)
    result_rng = f"{result_cl}{data_start_row + 1}:{result_cl}{last_data_row + 1}"
    ws.conditional_format(result_rng, {
        "type": "cell", "criteria": "equal to", "value": '"FAIL"', "format": fmt_fail,
    })
    ws.conditional_format(result_rng, {
        "type": "cell", "criteria": "equal to", "value": '"PASS"', "format": fmt_pass,
    })

    # Page setup
    ws.set_landscape()
    ws.set_paper(1)  # Letter
    ws.fit_to_pages(1, 0)
    ws.set_margins(left=0.5, right=0.5, top=0.5, bottom=0.5)
    ws.set_header("&C&B&14ENGINE MONITOR - Control Administrative")
    ws.center_horizontally()
    ws.print_area(0, 0, last_data_row, len(HEADERS) - 1)

    wb.close()
    print(f"Report exported: {output_path}")


def generate_sample_data():
    import datetime, random
    rows = []
    factories = ["SAE-A TECHNOTEX, S.A(1)", "SAE-A TECHNOTEX, S.A(2)", "EINS, S.A.(2)"]
    buyers = ["NIKE", "ADIDAS", "PUMA", "UNDER ARMOUR"]
    stages = ["CUTTING", "SEWING", "PACKING"]
    points = ["IN-LINE", "FINAL", "RANDOM"]

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
                    rows.append({
                        "fecha": datetime.date(2025, random.randint(1, 12), random.randint(1, 28)).isoformat(),
                        "factory": f, "buyer": b, "stage": s, "point": p,
                        "style": "STY-" + str(random.randint(1000, 9999)),
                        "po": "PO-" + str(random.randint(10000, 99999)),
                        "colL": "FABRIC", "colM": "",
                        "audits": audits, "failures": failures,
                        "measIns": meas_insp, "measDef": meas_def,
                        "visIns": vis_insp, "visDef": vis_def,
                        "failureRate": failures/audits, "measDefRate": meas_def/meas_insp, "visDefRate": vis_def/vis_insp,
                        "result": "PASS" if random.random() > 0.3 else "FAIL",
                        "mesFiltroKey": "", "mesTexto": "",
                    })
    return rows


def main():
    parser = argparse.ArgumentParser(description="Generate Engine Monitor dark Excel report")
    parser.add_argument("input", nargs="?", help="JSON input file (omit for stdin)")
    parser.add_argument("chart", nargs="?", help="Chart image file (PNG)")
    parser.add_argument("-o", "--output", default="engine_monitor.xlsx", help="Output .xlsx path")
    parser.add_argument("--sample", action="store_true", help="Use sample data")
    parser.add_argument("--filters", help="JSON string with active filters")
    args = parser.parse_args()

    chart_img = args.chart or ""
    filters = None
    if args.filters:
        try:
            filters = json.loads(args.filters)
        except json.JSONDecodeError:
            pass

    if args.sample:
        records = generate_sample_data()
        print("[INFO] Using sample data")
    elif args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            data = json.load(f)
        records = data if isinstance(data, list) else data.get("entries", data.get("data", []))
        print(f"[INFO] Loaded {len(records)} records from {args.input}")
    else:
        data = json.load(sys.stdin)
        records = data if isinstance(data, list) else data.get("entries", data.get("data", []))
        print(f"[INFO] Loaded {len(records)} records from stdin")

    build_workbook(records, chart_img, args.output, filters)


if __name__ == "__main__":
    main()
