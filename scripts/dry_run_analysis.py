import zipfile
import xml.etree.ElementTree as ET
import json
from collections import Counter, defaultdict

file_path = r"D:\AttendX\BTech_Student_Data_Session_2026-27.xlsx"
ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def parse_cell(c):
    cell_type = c.attrib.get('t', '')
    if cell_type == 'inlineStr':
        t_el = c.find('.//ns:t', ns)
        return t_el.text if t_el is not None and t_el.text else ""
    else:
        v_el = c.find('ns:v', ns)
        return v_el.text if v_el is not None and v_el.text else ""

# Branch and Section Mapping based on sheet names and section column
# Sheet -> (BranchCode, Section)
SHEET_MAPPING = {
    "CE A": ("CE", "SEC-A"),
    "CE B": ("CE", "SEC-B"),
    "CSE A": ("CSE", "SEC-A"),
    "CSE B": ("CSE", "SEC-B"),
    "CSE C": ("CSE", "SEC-C"),
    "CSE D": ("CSE", "SEC-D"),
    "EE A": ("EE", "SEC-A"),
    "EE B": ("EE", "SEC-B"),
    "ECE A": ("ECE", "SEC-A"),
    "ECE B": ("ECE", "SEC-B"),
    "ECE C": ("ECE", "SEC-C"),
    "IOT A": ("ECE(IOT)", "SEC-A"),
    "ME A": ("ME", "SEC-A"),
    "ME B": ("ME", "SEC-B"),
    "CHE A": ("CHE", "SEC-A"),
    "IT A": ("IT", "SEC-A"),
    "IT B": ("IT", "SEC-B"),
}

with zipfile.ZipFile(file_path, 'r') as z:
    wb_root = ET.fromstring(z.read("xl/workbook.xml"))
    sheets = []
    for sheet in wb_root.findall('.//ns:sheet', ns):
        sheets.append((sheet.attrib.get('name'), sheet.attrib.get('sheetId')))

    records = []
    rolls = []
    enrollments = []
    
    for sheet_name, s_id in sheets:
        branch_code, standard_section = SHEET_MAPPING.get(sheet_name, (sheet_name, "SEC-A"))
        sheet_path = f"xl/worksheets/sheet{s_id}.xml"
        root = ET.fromstring(z.read(sheet_path))
        rows = root.findall('.//ns:row', ns)
        
        for r in rows:
            r_num = int(r.attrib.get('r', 0))
            if r_num < 6:
                continue
            cells = {c.attrib.get('r', ''): parse_cell(c) for c in r.findall('ns:c', ns)}
            
            session = cells.get(f"A{r_num}", "").strip() or "2026-27"
            form_no = cells.get(f"B{r_num}", "").strip()
            roll_no = cells.get(f"C{r_num}", "").strip()
            enroll_no = cells.get(f"D{r_num}", "").strip()
            name = cells.get(f"E{r_num}", "").strip()
            father = cells.get(f"F{r_num}", "").strip()
            raw_sec = cells.get(f"G{r_num}", "").strip()
            raw_tp = cells.get(f"H{r_num}", "").strip()
            
            if not roll_no and not name:
                continue
            
            # Map T/P Batch:
            # e.g., CE1A1 -> P1, CE1A2 -> P2
            batch = "P1" if raw_tp.endswith("1") else "P2" if raw_tp.endswith("2") else "P1"
            
            # Internal authentication alias
            internal_alias = f"student.{roll_no}@attendx.mmmut.ac.in"
            
            rec = {
                "sheet": sheet_name,
                "row": r_num,
                "session": session,
                "form_no": form_no,
                "roll_no": roll_no,
                "enrollment_no": enroll_no,
                "full_name": name,
                "father_name": father,
                "raw_section": raw_sec,
                "branch_code": branch_code,
                "section": standard_section,
                "raw_tp": raw_tp,
                "batch": batch,
                "internal_alias": internal_alias,
                "role": "student"
            }
            records.append(rec)
            rolls.append(roll_no)
            enrollments.append(enroll_no)

# 1. Total students found
total_found = len(records)

# 2. Duplicate roll numbers
roll_counts = Counter(rolls)
dup_rolls = [r for r, count in roll_counts.items() if count > 1]

# 3. Invalid or incomplete
invalid_records = []
for r in records:
    errs = []
    if not r['roll_no'] or not r['roll_no'].isdigit():
        errs.append("Invalid/missing roll number")
    if not r['full_name']:
        errs.append("Missing student name")
    if not r['enrollment_no']:
        errs.append("Missing enrollment number")
    if not r['father_name']:
        errs.append("Missing father's name")
    if not r['branch_code'] or not r['section']:
        errs.append("Missing branch/section mapping")
    if not r['batch']:
        errs.append("Missing batch mapping")
    if errs:
        invalid_records.append({"roll": r['roll_no'], "name": r['full_name'], "errors": errs})

valid_records = len(records) - len(invalid_records)

# 4. Branch / Section / Batch Distribution
distribution = defaultdict(lambda: defaultdict(lambda: Counter()))
branch_totals = Counter()
section_totals = Counter()
batch_totals = Counter()

for r in records:
    b = r['branch_code']
    s = r['section']
    bt = r['batch']
    distribution[b][s][bt] += 1
    branch_totals[b] += 1
    section_totals[f"{b} {s}"] += 1
    batch_totals[bt] += 1

output_data = {
    "total_students_found": total_found,
    "valid_student_records": valid_records,
    "duplicate_roll_numbers_count": len(dup_rolls),
    "duplicate_roll_numbers": dup_rolls,
    "invalid_or_incomplete_count": len(invalid_records),
    "invalid_records": invalid_records,
    "branch_totals": dict(branch_totals),
    "section_totals": dict(section_totals),
    "batch_totals": dict(batch_totals),
    "distribution": {b: {s: dict(bts) for s, bts in secs.items()} for b, secs in distribution.items()},
    "sample_mappings": records[:5]
}

with open(r"D:\AttendX\scripts\dry_run_results.json", "w") as out_f:
    json.dump(output_data, out_f, indent=2)

print("Dry-run analysis completed successfully!")
print(f"Total students: {total_found}")
print(f"Valid: {valid_records}")
print(f"Duplicates: {len(dup_rolls)}")
print(f"Invalid/Incomplete: {len(invalid_records)}")
print("\nBranch Totals:")
for b, c in branch_totals.most_common():
    print(f"  {b}: {c}")
print("\nBatch Totals:")
for bt, c in batch_totals.items():
    print(f"  {bt}: {c}")
