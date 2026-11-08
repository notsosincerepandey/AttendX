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
                "roll_no": roll_no,
                "enrollment_no": enroll_no,
                "full_name": name,
                "father_name": father,
                "branch_code": branch_code,
                "section": standard_section,
                "raw_tp": raw_tp,
                "batch": batch,
                "academic_session": "2026-27",
                "semester": "Semester I",
                "internal_alias": internal_alias,
                "role": "student"
            }
            records.append(rec)

print(f"Extracted {len(records)} students from Excel.")
with open(r"D:\AttendX\scripts\student_manifest_1189.json", "w", encoding="utf-8") as f:
    json.dump(records, f, indent=2, ensure_ascii=False)
print("Manifest written to scripts/student_manifest_1189.json")
