import zipfile
import xml.etree.ElementTree as ET

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

with zipfile.ZipFile(file_path, 'r') as z:
    wb_root = ET.fromstring(z.read("xl/workbook.xml"))
    sheets = []
    for sheet in wb_root.findall('.//ns:sheet', ns):
        sheets.append((sheet.attrib.get('name'), sheet.attrib.get('sheetId')))

    incomplete_records = []
    invalid_roll_records = []
    total_checked = 0
    
    for name, s_id in sheets:
        sheet_path = f"xl/worksheets/sheet{s_id}.xml"
        root = ET.fromstring(z.read(sheet_path))
        rows = root.findall('.//ns:row', ns)
        
        for r in rows:
            r_num = int(r.attrib.get('r', 0))
            if r_num < 6:
                continue
            cells = {c.attrib.get('r', ''): parse_cell(c) for c in r.findall('ns:c', ns)}
            
            c_roll = cells.get(f"C{r_num}", "").strip()
            d_enroll = cells.get(f"D{r_num}", "").strip()
            e_name = cells.get(f"E{r_num}", "").strip()
            f_father = cells.get(f"F{r_num}", "").strip()
            g_sec = cells.get(f"G{r_num}", "").strip()
            h_tp = cells.get(f"H{r_num}", "").strip()
            
            if not c_roll and not e_name:
                continue
                
            total_checked += 1
            
            missing_fields = []
            if not c_roll: missing_fields.append("Roll No")
            if not d_enroll: missing_fields.append("Enrollment No")
            if not e_name: missing_fields.append("Name")
            if not f_father: missing_fields.append("Father's Name")
            if not g_sec: missing_fields.append("Section")
            if not h_tp: missing_fields.append("T/P Batch")
            
            if missing_fields:
                incomplete_records.append({
                    "sheet": name,
                    "row": r_num,
                    "roll": c_roll,
                    "name": e_name,
                    "missing": missing_fields
                })
                
            if not c_roll.isdigit() or len(c_roll) < 8:
                invalid_roll_records.append({
                    "sheet": name,
                    "row": r_num,
                    "roll": c_roll,
                    "name": e_name
                })

    print(f"Total checked: {total_checked}")
    print(f"Incomplete records: {len(incomplete_records)}")
    if incomplete_records:
        print("Sample incomplete:", incomplete_records[:5])
    print(f"Invalid roll records: {len(invalid_roll_records)}")
    if invalid_roll_records:
        print("Sample invalid roll:", invalid_roll_records[:5])
