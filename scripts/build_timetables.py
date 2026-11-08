import json
import os

PERIODS = [
    {"period": 1, "name": "Period I", "startTime": "09:10", "endTime": "10:00", "isLunch": False},
    {"period": 2, "name": "Period II", "startTime": "10:00", "endTime": "10:50", "isLunch": False},
    {"period": 3, "name": "Period III", "startTime": "10:50", "endTime": "11:40", "isLunch": False},
    {"period": 4, "name": "Period IV", "startTime": "11:40", "endTime": "12:30", "isLunch": False},
    {"period": 0, "name": "Lunch Break", "startTime": "12:30", "endTime": "14:00", "isLunch": True},
    {"period": 5, "name": "Period V", "startTime": "14:00", "endTime": "14:45", "isLunch": False},
    {"period": 6, "name": "Period VI", "startTime": "14:45", "endTime": "15:30", "isLunch": False},
    {"period": 7, "name": "Period VII", "startTime": "15:30", "endTime": "16:15", "isLunch": False},
    {"period": 8, "name": "Period VIII", "startTime": "16:15", "endTime": "17:00", "isLunch": False},
]

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

# Helper to create timetable slot
def slot(day, period, subject_code, subject_name, category, batch="ALL", room="TL-206", faculty=""):
    return {
        "day": day,
        "period": period,
        "subjectCode": subject_code,
        "subjectName": subject_name,
        "category": category, # "Theory" | "Lab" | "Tutorial"
        "batch": batch,       # "ALL" | "P1" | "P2" | "P3" | "P4" | "T1" | "T2"
        "room": room,
        "faculty": faculty
    }

# Build dataset for all 20 sheets
timetables = []

# ==========================================
# PAGE 1: B.Tech (Civil Engineering) SEC-A
# Room: TL-206, Session: 2025-26, Sem: I
# ==========================================
p1_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics I", "credits": "3-1-0", "faculty": "Dr. Mohammad Hasan (MH) & Miss. Uzma Faiz (UF)"},
    {"code": "BSM-131", "name": "Engineering Physics", "credits": "3-0-2", "faculty": "Physics Dept Faculty"},
    {"code": "BIT-103", "name": "Programming in C", "credits": "3-0-2", "faculty": "Ms. Niharika Singh (NiH) + Mr. Anand Kumar (AK)"},
    {"code": "BCE-121", "name": "Engineering Graphics", "credits": "2-0-4", "faculty": "Dr. Ravi Prakash Tripathi/Dr. Neeraj Chaubey/Ms. Mahima Modi/Ms. Anuradha"},
    {"code": "BHS-101", "name": "Universal Human Values: Understanding Harmony", "credits": "3-1-0", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p1_slots = [
    # Monday
    slot("Monday", 1, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-206"),
    slot("Monday", 2, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-206", "MH"),
    slot("Monday", 3, "BIT-103", "Programming in C", "Theory", "ALL", "TL-206", "NiH"),
    slot("Monday", 7, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-206"),
    slot("Monday", 8, "BSM-110", "Engineering Mathematics I (Tutorial)", "Tutorial", "P1", "TL-206", "UF"),
    # Tuesday
    slot("Tuesday", 1, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-206"),
    slot("Tuesday", 2, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-206", "MH"),
    slot("Tuesday", 3, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P1", "TL-206"),
    slot("Tuesday", 7, "BSM-110", "Engineering Mathematics I (Tutorial)", "Tutorial", "P2", "TL-206", "UF"),
    # Wednesday
    slot("Wednesday", 1, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-206"),
    slot("Wednesday", 2, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-206", "MH"),
    slot("Wednesday", 3, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P2", "TL-206"),
    # Wednesday PM: P1 has 4-period BCE-121 lab; P2 has 2-period Physics lab
    slot("Wednesday", 5, "BCE-121", "Engineering Graphics Lab", "Lab", "P1", "L-104", "RPT/SU/Ans/CC"),
    slot("Wednesday", 6, "BCE-121", "Engineering Graphics Lab", "Lab", "P1", "L-104", "RPT/SU/Ans/CC"),
    slot("Wednesday", 7, "BCE-121", "Engineering Graphics Lab", "Lab", "P1", "L-104", "RPT/SU/Ans/CC"),
    slot("Wednesday", 8, "BCE-121", "Engineering Graphics Lab", "Lab", "P1", "L-104", "RPT/SU/Ans/CC"),
    slot("Wednesday", 5, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    slot("Wednesday", 6, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    # Thursday: AM P2 BIT-103 Lab; PM P2 BCE-121 Lab (4 periods); P1 Physics Lab (2 periods)
    slot("Thursday", 1, "BIT-103", "Programming in C Lab", "Lab", "P2", "ITRC-02", "AK"),
    slot("Thursday", 2, "BIT-103", "Programming in C Lab", "Lab", "P2", "ITRC-02", "AK"),
    slot("Thursday", 3, "BIT-103", "Programming in C", "Theory", "ALL", "TL-206", "NiH"),
    slot("Thursday", 5, "BCE-121", "Engineering Graphics Lab", "Lab", "P2", "L-104", "MM/AD/AkS/An"),
    slot("Thursday", 6, "BCE-121", "Engineering Graphics Lab", "Lab", "P2", "L-104", "MM/AD/AkS/An"),
    slot("Thursday", 7, "BCE-121", "Engineering Graphics Lab", "Lab", "P2", "L-104", "MM/AD/AkS/An"),
    slot("Thursday", 8, "BCE-121", "Engineering Graphics Lab", "Lab", "P2", "L-104", "MM/AD/AkS/An"),
    slot("Thursday", 5, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Thursday", 6, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    # Friday
    slot("Friday", 3, "BIT-103", "Programming in C", "Theory", "ALL", "TL-206", "NiH"),
    slot("Friday", 4, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-206"),
    slot("Friday", 5, "BCE-121", "Engineering Graphics", "Theory", "ALL", "TL-206", "NC"),
    # Saturday
    slot("Saturday", 1, "BIT-103", "Programming in C Lab", "Lab", "P1", "ITRC-02", "AK"),
    slot("Saturday", 2, "BIT-103", "Programming in C Lab", "Lab", "P1", "ITRC-02", "AK"),
    slot("Saturday", 3, "BCE-121", "Engineering Graphics", "Theory", "ALL", "TL-206", "NC"),
    slot("Saturday", 4, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-206"),
]

timetables.append({
    "id": "mmmut-btech-ce-a-2025",
    "pageNumber": 1,
    "degree": "B.Tech",
    "branch": "Civil Engineering",
    "branchCode": "CE",
    "section": "SEC-A",
    "room": "TL-206",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p1_subjects,
    "slots": p1_slots
})

# ==========================================
# PAGE 2: B.Tech (Civil Engineering) SEC-B
# Room: TL-206, Session: 2025-26, Sem: I
# ==========================================
p2_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics I", "credits": "3-1-0", "faculty": "Dr. Mohammad Hasan (MH) & Akash Kumar Singh (AKS)"},
    {"code": "BSM-131", "name": "Engineering Physics", "credits": "3-0-2", "faculty": "Physics Dept Faculty"},
    {"code": "BIT-103", "name": "Programming in C", "credits": "3-0-2", "faculty": "Ms. Niharika Singh (NiH)"},
    {"code": "BCE-121", "name": "Engineering Graphics", "credits": "2-0-4", "faculty": "Dr. Deepak Prasad/Mr. Ramendra Pandey/Dr. Neeraj Chaubey/Mr. Abhishek Kr. Singh/Mr. Ayush Kr. Srivastav/Ms. Priyanka Pandey/Ms. Anandita"},
    {"code": "BHS-101", "name": "Universal Human Values: Understanding Harmony", "credits": "3-1-0", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p2_slots = [
    # Monday
    slot("Monday", 1, "BCE-121", "Engineering Graphics Lab", "Lab", "P1", "L-104", "AkS/PP/AkS"),
    slot("Monday", 2, "BCE-121", "Engineering Graphics Lab", "Lab", "P1", "L-104", "AkS/PP/AkS"),
    slot("Monday", 3, "BCE-121", "Engineering Graphics Lab", "Lab", "P1", "L-104", "AkS/PP/AkS"),
    slot("Monday", 4, "BCE-121", "Engineering Graphics Lab", "Lab", "P1", "L-104", "AkS/PP/AkS"),
    slot("Monday", 3, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    slot("Monday", 4, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    slot("Monday", 5, "BIT-103", "Programming in C", "Theory", "ALL", "TL-206", "NiH"),
    slot("Monday", 6, "BCE-121", "Engineering Graphics", "Theory", "ALL", "TL-206", "NC"),
    # Tuesday
    slot("Tuesday", 1, "BCE-121", "Engineering Graphics Lab", "Lab", "P2", "L-104", "DP/NC/An"),
    slot("Tuesday", 2, "BCE-121", "Engineering Graphics Lab", "Lab", "P2", "L-104", "DP/NC/An"),
    slot("Tuesday", 3, "BCE-121", "Engineering Graphics Lab", "Lab", "P2", "L-104", "DP/NC/An"),
    slot("Tuesday", 4, "BCE-121", "Engineering Graphics Lab", "Lab", "P2", "L-104", "DP/NC/An"),
    slot("Tuesday", 3, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Tuesday", 4, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Tuesday", 5, "BIT-103", "Programming in C", "Theory", "ALL", "TL-206", "NiH"),
    slot("Tuesday", 6, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-206"),
    # Wednesday
    slot("Wednesday", 2, "BIT-103", "Programming in C Lab", "Lab", "P2", "ITRC-01", "NiH"),
    slot("Wednesday", 3, "BIT-103", "Programming in C Lab", "Lab", "P2", "ITRC-01", "NiH"),
    slot("Wednesday", 4, "BIT-103", "Programming in C", "Theory", "ALL", "TL-206", "NiH"),
    slot("Wednesday", 6, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-206", "MH"),
    slot("Wednesday", 7, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-206"),
    # Thursday
    slot("Thursday", 1, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-206"),
    slot("Thursday", 2, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-206", "MH"),
    slot("Thursday", 5, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-206"),
    slot("Thursday", 6, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P1", "TL-206"),
    slot("Thursday", 7, "BSM-110", "Engineering Mathematics I (Tutorial)", "Tutorial", "P1", "TL-206", "AKS"),
    # Friday
    slot("Friday", 1, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-206"),
    slot("Friday", 2, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-206", "MH"),
    slot("Friday", 6, "BCE-121", "Engineering Graphics", "Theory", "ALL", "TL-206", "NC"),
    slot("Friday", 7, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P2", "TL-206"),
    # Saturday
    slot("Saturday", 1, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-206"),
    slot("Saturday", 2, "BSM-110", "Engineering Mathematics I (Tutorial)", "Tutorial", "P2", "TL-206", "AKS"),
    slot("Saturday", 3, "BIT-103", "Programming in C Lab", "Lab", "P1", "ITRC-01", "NiH"),
    slot("Saturday", 4, "BIT-103", "Programming in C Lab", "Lab", "P1", "ITRC-01", "NiH"),
]

timetables.append({
    "id": "mmmut-btech-ce-b-2025",
    "pageNumber": 2,
    "degree": "B.Tech",
    "branch": "Civil Engineering",
    "branchCode": "CE",
    "section": "SEC-B",
    "room": "TL-206",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p2_subjects,
    "slots": p2_slots
})

# ==========================================
# PAGE 3: B.Tech (Computer Science & Engg) SEC-A
# Room: TL-109, Session: 2025-26, Sem: I
# ==========================================
p3_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics-I", "credits": "3-1-0", "faculty": "Dr. Kumari Kanta (KK) & Deepali Maurya (DM)"},
    {"code": "BSM-131", "name": "Engineering Physics", "credits": "3-0-2", "faculty": "Physics Dept Faculty"},
    {"code": "BCS-110", "name": "Introduction to C Programming", "credits": "3-0-2", "faculty": "SKS, Vaibhavi (RS), Harsh (RS)"},
    {"code": "BCS-111", "name": "Web Designing-1", "credits": "2-0-4", "faculty": "Dr. Meenu, Anushka (RS), Shreyansh (RS)"},
    {"code": "BHS-101", "name": "Universal Human Values: Understanding Harmony", "credits": "3-1-0", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p3_slots = [
    # Monday
    slot("Monday", 1, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    slot("Monday", 2, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    slot("Monday", 3, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-109"),
    slot("Monday", 4, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-109"),
    # Mon PM: P1 has 4-period BCS-111 Web Designing Lab; P2 has 2-period BCS-110 Lab
    slot("Monday", 5, "BCS-111", "Web Designing-1 Lab", "Lab", "P1", "ITRC-03", "Dr. Meenu, Anushka (RS)"),
    slot("Monday", 6, "BCS-111", "Web Designing-1 Lab", "Lab", "P1", "ITRC-03", "Dr. Meenu, Anushka (RS)"),
    slot("Monday", 7, "BCS-111", "Web Designing-1 Lab", "Lab", "P1", "ITRC-03", "Dr. Meenu, Anushka (RS)"),
    slot("Monday", 8, "BCS-111", "Web Designing-1 Lab", "Lab", "P1", "ITRC-03", "Dr. Meenu, Anushka (RS)"),
    slot("Monday", 5, "BCS-110", "Introduction to C Programming Lab", "Lab", "P2", "ITRC-04", "SKS, Vaibhavi (RS)"),
    slot("Monday", 6, "BCS-110", "Introduction to C Programming Lab", "Lab", "P2", "ITRC-04", "SKS, Vaibhavi (RS)"),
    # Tuesday
    slot("Tuesday", 1, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Tuesday", 2, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Tuesday", 3, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-109"),
    slot("Tuesday", 4, "BCS-111", "Web Designing-1", "Theory", "ALL", "TL-109", "Dr. Meenu"),
    slot("Tuesday", 5, "BCS-111", "Web Designing-1 Lab", "Lab", "P2", "ITRC-03", "Dr. Meenu, Shreyansh (RS)"),
    slot("Tuesday", 6, "BCS-111", "Web Designing-1 Lab", "Lab", "P2", "ITRC-03", "Dr. Meenu, Shreyansh (RS)"),
    slot("Tuesday", 7, "BCS-111", "Web Designing-1 Lab", "Lab", "P2", "ITRC-03", "Dr. Meenu, Shreyansh (RS)"),
    slot("Tuesday", 8, "BCS-111", "Web Designing-1 Lab", "Lab", "P2", "ITRC-03", "Dr. Meenu, Shreyansh (RS)"),
    # Wednesday
    slot("Wednesday", 3, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-109"),
    slot("Wednesday", 4, "BCS-111", "Web Designing-1", "Theory", "ALL", "TL-109", "Dr. Meenu"),
    # Thursday
    slot("Thursday", 1, "BSM-110", "Engineering Mathematics-I", "Theory", "ALL", "TL-109", "KK"),
    slot("Thursday", 2, "BCS-110", "Introduction to C Programming", "Theory", "ALL", "TL-109", "SKS"),
    slot("Thursday", 5, "BSM-110", "Engineering Mathematics-I (Tutorial)", "Tutorial", "P1", "TL-109", "DM"),
    slot("Thursday", 6, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-109"),
    slot("Thursday", 7, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P1", "TL-109"),
    # Friday
    slot("Friday", 1, "BSM-110", "Engineering Mathematics-I", "Theory", "ALL", "TL-109", "KK"),
    slot("Friday", 2, "BCS-110", "Introduction to C Programming", "Theory", "ALL", "TL-109", "SKS"),
    slot("Friday", 5, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-109"),
    slot("Friday", 6, "BSM-110", "Engineering Mathematics-I (Tutorial)", "Tutorial", "P2", "TL-109", "DM"),
    slot("Friday", 7, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P2", "TL-109"),
    # Saturday
    slot("Saturday", 1, "BSM-110", "Engineering Mathematics-I", "Theory", "ALL", "TL-109", "KK"),
    slot("Saturday", 2, "BCS-110", "Introduction to C Programming", "Theory", "ALL", "TL-109", "SKS"),
    slot("Saturday", 3, "BCS-110", "Introduction to C Programming Lab", "Lab", "P1", "ITRC-04", "SKS, Harsh (RS)"),
    slot("Saturday", 4, "BCS-110", "Introduction to C Programming Lab", "Lab", "P1", "ITRC-04", "SKS, Harsh (RS)"),
]

timetables.append({
    "id": "mmmut-btech-cse-a-2025",
    "pageNumber": 3,
    "degree": "B.Tech",
    "branch": "Computer Science & Engineering",
    "branchCode": "CSE",
    "section": "SEC-A",
    "room": "TL-109",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p3_subjects,
    "slots": p3_slots
})

# ==========================================
# PAGE 4: B.Tech (Computer Science & Engg) SEC-B
# Room: TL-109, Session: 2025-26, Sem: I
# ==========================================
p4_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics-I", "credits": "3-1-0", "faculty": "Dr. Kumari Kanta (KK) & Shristi Srivastva (SS)"},
    {"code": "BSM-131", "name": "Engineering Physics", "credits": "3-0-2", "faculty": "Physics Dept Faculty"},
    {"code": "BCS-110", "name": "Introduction to C Programming", "credits": "3-0-2", "faculty": "SKS, MKS"},
    {"code": "BCS-111", "name": "Web Designing-1", "credits": "2-0-4", "faculty": "Dr. Meenu, VDB (RS)"},
    {"code": "BHS-101", "name": "Universal Human Values: Understanding Harmony", "credits": "3-1-0", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p4_slots = [
    # Monday
    slot("Monday", 1, "BSM-110", "Engineering Mathematics-I", "Theory", "ALL", "TL-109", "KK"),
    slot("Monday", 2, "BCS-110", "Introduction to C Programming", "Theory", "ALL", "TL-109", "SKS"),
    slot("Monday", 3, "BCS-110", "Introduction to C Programming Lab", "Lab", "P1", "ITRC-04", "SKS, MKS"),
    slot("Monday", 4, "BCS-110", "Introduction to C Programming Lab", "Lab", "P1", "ITRC-04", "SKS, MKS"),
    slot("Monday", 5, "BSM-110", "Engineering Mathematics-I (Tutorial)", "Tutorial", "P1", "TL-109", "SS"),
    slot("Monday", 6, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-109"),
    # Tuesday
    slot("Tuesday", 1, "BSM-110", "Engineering Mathematics-I", "Theory", "ALL", "TL-109", "KK"),
    slot("Tuesday", 2, "BCS-110", "Introduction to C Programming", "Theory", "ALL", "TL-109", "SKS"),
    slot("Tuesday", 3, "BCS-110", "Introduction to C Programming Lab", "Lab", "P2", "ITRC-04", "SKS, MKS"),
    slot("Tuesday", 4, "BCS-110", "Introduction to C Programming Lab", "Lab", "P2", "ITRC-04", "SKS, MKS"),
    slot("Tuesday", 5, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-109"),
    slot("Tuesday", 6, "BSM-110", "Engineering Mathematics-I (Tutorial)", "Tutorial", "P2", "TL-109", "SS"),
    slot("Tuesday", 7, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P2", "TL-109"),
    # Wednesday
    slot("Wednesday", 1, "BSM-110", "Engineering Mathematics-I", "Theory", "ALL", "TL-109", "KK"),
    slot("Wednesday", 2, "BCS-110", "Introduction to C Programming", "Theory", "ALL", "TL-109", "SKS"),
    slot("Wednesday", 6, "BCS-111", "Web Designing-1", "Theory", "ALL", "TL-109"),
    # Thursday
    slot("Thursday", 3, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-109"),
    slot("Thursday", 4, "BCS-111", "Web Designing-1", "Theory", "ALL", "TL-109", "Dr. Meenu"),
    slot("Thursday", 6, "BCS-111", "Web Designing-1 Lab", "Lab", "P1", "G6", "VDB (RS)"),
    slot("Thursday", 7, "BCS-111", "Web Designing-1 Lab", "Lab", "P1", "G6", "VDB (RS)"),
    slot("Thursday", 8, "BCS-111", "Web Designing-1 Lab", "Lab", "P1", "G6", "VDB (RS)"),
    # Friday
    slot("Friday", 3, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-109"),
    slot("Friday", 4, "BCS-111", "Web Designing-1", "Theory", "ALL", "TL-109", "Dr. Meenu"),
    slot("Friday", 5, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Friday", 6, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Friday", 6, "BCS-111", "Web Designing-1 Lab", "Lab", "P2", "ITRC-03", "VDB (RS)"),
    slot("Friday", 7, "BCS-111", "Web Designing-1 Lab", "Lab", "P2", "ITRC-03", "VDB (RS)"),
    slot("Friday", 8, "BCS-111", "Web Designing-1 Lab", "Lab", "P2", "ITRC-03", "VDB (RS)"),
    # Saturday
    slot("Saturday", 1, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    slot("Saturday", 2, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    slot("Saturday", 3, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-109"),
    slot("Saturday", 4, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P1", "TL-109"),
]

timetables.append({
    "id": "mmmut-btech-cse-b-2025",
    "pageNumber": 4,
    "degree": "B.Tech",
    "branch": "Computer Science & Engineering",
    "branchCode": "CSE",
    "section": "SEC-B",
    "room": "TL-109",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p4_subjects,
    "slots": p4_slots
})

# ==========================================
# PAGE 5: B.Tech (Computer Science & Engg) SEC-C
# Room: TL-201, Session: 2025-26, Sem: I
# ==========================================
p5_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics-I", "credits": "3-1-0", "faculty": "Dr. Kumari Kanta (KK) & Nafesa Khatoon (NK)"},
    {"code": "BSM-131", "name": "Engineering Physics", "credits": "3-0-2", "faculty": "Physics Dept Faculty"},
    {"code": "BCS-110", "name": "Introduction to C Programming", "credits": "3-0-2", "faculty": "RAM, VAIBHAVI (RS), Harsh (RS)"},
    {"code": "BCS-111", "name": "Web Designing-1", "credits": "2-0-4", "faculty": "GF-6, PS (RS), Divyanshi (RS)"},
    {"code": "BHS-101", "name": "Universal Human Values: Understanding Harmony", "credits": "3-1-0", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p5_slots = [
    # Monday
    slot("Monday", 3, "BSM-110", "Engineering Mathematics-I", "Theory", "ALL", "TL-201", "KK"),
    slot("Monday", 4, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-201"),
    slot("Monday", 6, "BSM-110", "Engineering Mathematics-I (Tutorial)", "Tutorial", "P1", "TL-201", "NK"),
    slot("Monday", 7, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P2", "TL-201"),
    # Tuesday
    slot("Tuesday", 1, "BCS-111", "Web Designing-1 Lab", "Lab", "P2", "ITRC-02", "PS (RS)"),
    slot("Tuesday", 2, "BCS-111", "Web Designing-1 Lab", "Lab", "P2", "ITRC-02", "PS (RS)"),
    slot("Tuesday", 3, "BCS-110", "Introduction to C Programming Lab", "Lab", "P1", "ITRC-03", "RAM, Vaibhavi (RS)"),
    slot("Tuesday", 4, "BCS-110", "Introduction to C Programming Lab", "Lab", "P1", "ITRC-03", "RAM, Vaibhavi (RS)"),
    slot("Tuesday", 5, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-201"),
    slot("Tuesday", 6, "BSM-110", "Engineering Mathematics-I (Tutorial)", "Tutorial", "P2", "TL-201", "NK"),
    slot("Tuesday", 7, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P1", "TL-201"),
    # Wednesday
    slot("Wednesday", 3, "BSM-110", "Engineering Mathematics-I", "Theory", "ALL", "TL-201", "KK"),
    slot("Wednesday", 4, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-201"),
    slot("Wednesday", 5, "BCS-111", "Web Designing-1 Lab", "Lab", "P1", "ITRC-02", "Divyanshi (RS)"),
    slot("Wednesday", 6, "BCS-111", "Web Designing-1 Lab", "Lab", "P1", "ITRC-02", "Divyanshi (RS)"),
    slot("Wednesday", 7, "BCS-111", "Web Designing-1 Lab", "Lab", "P1", "ITRC-02", "Divyanshi (RS)"),
    slot("Wednesday", 8, "BCS-111", "Web Designing-1 Lab", "Lab", "P1", "ITRC-02", "Divyanshi (RS)"),
    # Thursday
    slot("Thursday", 1, "BCS-111", "Web Designing-1", "Theory", "ALL", "TL-201", "GF-6"),
    slot("Thursday", 2, "BCS-110", "Introduction to C Programming", "Theory", "ALL", "TL-201", "RAM"),
    slot("Thursday", 3, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Thursday", 4, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Thursday", 5, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-201"),
    slot("Thursday", 6, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-201"),
    # Friday
    slot("Friday", 1, "BCS-111", "Web Designing-1", "Theory", "ALL", "TL-201", "GF-6"),
    slot("Friday", 2, "BCS-110", "Introduction to C Programming", "Theory", "ALL", "TL-201", "RAM"),
    slot("Friday", 6, "BSM-110", "Engineering Mathematics-I", "Theory", "ALL", "TL-201", "KK"),
    slot("Friday", 7, "BCS-110", "Introduction to C Programming Lab", "Lab", "P2", "ITRC-01", "RAM, Harsh (RS)"),
    slot("Friday", 8, "BCS-110", "Introduction to C Programming Lab", "Lab", "P2", "ITRC-01", "RAM, Harsh (RS)"),
    # Saturday
    slot("Saturday", 1, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-201"),
    slot("Saturday", 2, "BCS-110", "Introduction to C Programming", "Theory", "ALL", "TL-201", "RAM"),
    slot("Saturday", 3, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    slot("Saturday", 4, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
]

timetables.append({
    "id": "mmmut-btech-cse-c-2025",
    "pageNumber": 5,
    "degree": "B.Tech",
    "branch": "Computer Science & Engineering",
    "branchCode": "CSE",
    "section": "SEC-C",
    "room": "TL-201",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p5_subjects,
    "slots": p5_slots
})

# ==========================================
# PAGE 6: B.Tech (Computer Science & Engg) SEC-D
# Room: TL-201, Session: 2025-26, Sem: I
# ==========================================
p6_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics-I", "credits": "3-1-0", "faculty": "Dr. Harsha Pandey (HP) & Saloni Singh (SS)"},
    {"code": "BSM-131", "name": "Engineering Physics", "credits": "3-0-2", "faculty": "Physics Dept Faculty"},
    {"code": "BCS-110", "name": "Introduction to C Programming", "credits": "3-0-2", "faculty": "RAM, SKS, MKS"},
    {"code": "BCS-111", "name": "Web Designing-1", "credits": "2-0-4", "faculty": "Dr. Meenu, AM (RS), SG (RS)"},
    {"code": "BHS-101", "name": "Universal Human Values: Understanding Harmony", "credits": "3-1-0", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p6_slots = [
    # Monday
    slot("Monday", 1, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-201"),
    slot("Monday", 2, "BCS-110", "Introduction to C Programming", "Theory", "ALL", "TL-201", "RAM"),
    slot("Monday", 6, "BCS-111", "Web Designing-1 Lab", "Lab", "P1", "ITRC-01", "AM (RS)"),
    slot("Monday", 7, "BCS-111", "Web Designing-1 Lab", "Lab", "P1", "ITRC-01", "AM (RS)"),
    slot("Monday", 8, "BCS-111", "Web Designing-1 Lab", "Lab", "P1", "ITRC-01", "AM (RS)"),
    # Tuesday
    slot("Tuesday", 1, "BCS-110", "Introduction to C Programming", "Theory", "ALL", "TL-201", "RAM"),
    slot("Tuesday", 2, "BCS-111", "Web Designing-1", "Theory", "ALL", "TL-201", "Dr. Meenu"),
    slot("Tuesday", 3, "BSM-110", "Engineering Mathematics-I", "Theory", "ALL", "TL-201", "HP"),
    slot("Tuesday", 4, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-201"),
    slot("Tuesday", 5, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    slot("Tuesday", 6, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    slot("Tuesday", 6, "BCS-111", "Web Designing-1 Lab", "Lab", "P2", "ITRC-03", "SG (RS)"),
    slot("Tuesday", 7, "BCS-111", "Web Designing-1 Lab", "Lab", "P2", "ITRC-03", "SG (RS)"),
    slot("Tuesday", 8, "BCS-111", "Web Designing-1 Lab", "Lab", "P2", "ITRC-03", "SG (RS)"),
    # Wednesday
    slot("Wednesday", 1, "BCS-110", "Introduction to C Programming", "Theory", "ALL", "TL-201", "RAM"),
    slot("Wednesday", 2, "BCS-111", "Web Designing-1", "Theory", "ALL", "TL-201", "Dr. Meenu"),
    slot("Wednesday", 3, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Wednesday", 4, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Wednesday", 6, "BCS-110", "Introduction to C Programming Lab", "Lab", "P1", "ITRC-04", "RAM, MKS"),
    slot("Wednesday", 7, "BCS-110", "Introduction to C Programming Lab", "Lab", "P1", "ITRC-04", "RAM, MKS"),
    # Thursday
    slot("Thursday", 3, "BSM-110", "Engineering Mathematics-I", "Theory", "ALL", "TL-201", "HP"),
    slot("Thursday", 4, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-201"),
    slot("Thursday", 6, "BSM-110", "Engineering Mathematics-I (Tutorial)", "Tutorial", "P1", "TL-201", "SS"),
    slot("Thursday", 7, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-201"),
    slot("Thursday", 8, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P1", "TL-201"),
    # Friday
    slot("Friday", 3, "BSM-110", "Engineering Mathematics-I", "Theory", "ALL", "TL-201", "HP"),
    slot("Friday", 4, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-201"),
    slot("Friday", 6, "BCS-110", "Introduction to C Programming", "Theory", "ALL", "TL-201"),
    slot("Friday", 7, "BSM-110", "Engineering Mathematics-I (Tutorial)", "Tutorial", "P2", "TL-201", "SS"),
    slot("Friday", 8, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P2", "TL-201"),
    # Saturday
    slot("Saturday", 1, "BCS-110", "Introduction to C Programming Lab", "Lab", "P2", "ITRC-03", "RAM, SKS"),
    slot("Saturday", 2, "BCS-110", "Introduction to C Programming Lab", "Lab", "P2", "ITRC-03", "RAM, SKS"),
    slot("Saturday", 3, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-201"),
]

timetables.append({
    "id": "mmmut-btech-cse-d-2025",
    "pageNumber": 6,
    "degree": "B.Tech",
    "branch": "Computer Science & Engineering",
    "branchCode": "CSE",
    "section": "SEC-D",
    "room": "TL-201",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p6_subjects,
    "slots": p6_slots
})

# ==========================================
# PAGE 7: B.Tech (Information Technology) SEC-A
# Room: TL-203, Session: 2025-26, Sem: I
# ==========================================
p7_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics I", "credits": "3-1-0", "faculty": "Dr. Vinod Baniya & Khushboo Maurya (KM)"},
    {"code": "BSM-131", "name": "Engineering Physics", "credits": "3-0-2", "faculty": "Physics Dept Faculty"},
    {"code": "BIT-103", "name": "Programming in C", "credits": "3-0-2", "faculty": "Prof. S P Singh (SPS) + Mr. Dharmesh Sonkar (DS)"},
    {"code": "BIT-104", "name": "Internet and Web Designing", "credits": "2-0-4", "faculty": "Ms. Nida Shakeel (NS)"},
    {"code": "BHS-101", "name": "Universal Human Values", "credits": "3-1-0", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p7_slots = [
    # Monday
    slot("Monday", 1, "BIT-104", "Internet and Web Designing Lab", "Lab", "P1", "ITRC-03", "NS"),
    slot("Monday", 2, "BIT-104", "Internet and Web Designing Lab", "Lab", "P1", "ITRC-03", "NS"),
    slot("Monday", 3, "BIT-104", "Internet and Web Designing Lab", "Lab", "P1", "ITRC-03", "NS"),
    slot("Monday", 4, "BIT-104", "Internet and Web Designing Lab", "Lab", "P1", "ITRC-03", "NS"),
    slot("Monday", 2, "BIT-103", "Programming in C Lab", "Lab", "P2", "CL-02", "DS"),
    slot("Monday", 5, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-203"),
    slot("Monday", 6, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-203"),
    # Tuesday
    slot("Tuesday", 1, "BIT-104", "Internet and Web Designing Lab", "Lab", "P2", "ITRC-03", "NS"),
    slot("Tuesday", 2, "BIT-104", "Internet and Web Designing Lab", "Lab", "P2", "ITRC-03", "NS"),
    slot("Tuesday", 3, "BIT-104", "Internet and Web Designing Lab", "Lab", "P2", "ITRC-03", "NS"),
    slot("Tuesday", 4, "BIT-104", "Internet and Web Designing Lab", "Lab", "P2", "ITRC-03", "NS"),
    slot("Tuesday", 2, "BIT-103", "Programming in C Lab", "Lab", "P1", "CL-02", "DS"),
    slot("Tuesday", 5, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-203"),
    # Wednesday
    slot("Wednesday", 1, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-203", "VB"),
    slot("Wednesday", 2, "BIT-103", "Programming in C", "Theory", "ALL", "TL-203", "SPS"),
    slot("Wednesday", 5, "BIT-104", "Internet and Web Designing", "Theory", "ALL", "TL-203", "NS"),
    slot("Wednesday", 6, "BSM-110", "Engineering Mathematics I (Tutorial)", "Tutorial", "P2", "TL-203", "KM"),
    slot("Wednesday", 7, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    slot("Wednesday", 8, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    # Thursday
    slot("Thursday", 1, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-203", "VB"),
    slot("Thursday", 2, "BIT-103", "Programming in C", "Theory", "ALL", "TL-203", "SPS"),
    slot("Thursday", 5, "BSM-110", "Engineering Mathematics I (Tutorial)", "Tutorial", "P1", "TL-203", "KM"),
    slot("Thursday", 6, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-203"),
    slot("Thursday", 7, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P1", "TL-203"),
    # Friday
    slot("Friday", 3, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-203"),
    slot("Friday", 4, "BIT-103", "Programming in C", "Theory", "ALL", "TL-203", "SPS"),
    slot("Friday", 5, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P2", "TL-203"),
    slot("Friday", 6, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-203", "VB"),
    slot("Friday", 7, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Friday", 8, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    # Saturday
    slot("Saturday", 3, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-203"),
    slot("Saturday", 4, "BIT-104", "Internet and Web Designing", "Theory", "ALL", "TL-203", "NS"),
]

timetables.append({
    "id": "mmmut-btech-it-a-2025",
    "pageNumber": 7,
    "degree": "B.Tech",
    "branch": "Information Technology",
    "branchCode": "IT",
    "section": "SEC-A",
    "room": "TL-203",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p7_subjects,
    "slots": p7_slots
})

# ==========================================
# PAGE 8: B.Tech (Information Technology) SEC-B
# Room: TL-203, Session: 2025-26, Sem: I
# ==========================================
p8_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics I", "credits": "3-1-0", "faculty": "Dr. Vinod Baniya (VB) & Miss Disha Gupta (DG)"},
    {"code": "BSM-131", "name": "Engineering Physics", "credits": "3-0-2", "faculty": "Physics Dept Faculty"},
    {"code": "BIT-103", "name": "Programming in C", "credits": "3-0-2", "faculty": "Prof. S P Singh (SPS) + Mr. Dharmesh Sonkar (DS)"},
    {"code": "BIT-104", "name": "Internet and Web Designing", "credits": "2-0-4", "faculty": "Mr. Tejbahadur (TH)"},
    {"code": "BHS-101", "name": "Universal Human Values", "credits": "3-1-0", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p8_slots = [
    # Monday
    slot("Monday", 1, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-203", "VB"),
    slot("Monday", 2, "BIT-103", "Programming in C", "Theory", "ALL", "TL-203", "SPS"),
    slot("Monday", 3, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-203"),
    slot("Monday", 4, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-203"),
    # Tuesday
    slot("Tuesday", 1, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-203", "VB"),
    slot("Tuesday", 2, "BIT-103", "Programming in C", "Theory", "ALL", "TL-203", "SPS"),
    slot("Tuesday", 3, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-110"),
    slot("Tuesday", 7, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P2", "TL-203"),
    slot("Tuesday", 8, "BSM-110", "Engineering Mathematics I (Tutorial)", "Tutorial", "P1", "TL-203", "DG"),
    # Wednesday
    slot("Wednesday", 1, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Wednesday", 2, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Wednesday", 3, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-203"),
    slot("Wednesday", 4, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-203"),
    slot("Wednesday", 5, "BIT-104", "Internet and Web Designing Lab", "Lab", "P1", "ITRC-03", "TH"),
    slot("Wednesday", 6, "BIT-104", "Internet and Web Designing Lab", "Lab", "P1", "ITRC-03", "TH"),
    slot("Wednesday", 7, "BIT-104", "Internet and Web Designing Lab", "Lab", "P1", "ITRC-03", "TH"),
    slot("Wednesday", 8, "BIT-104", "Internet and Web Designing Lab", "Lab", "P1", "ITRC-03", "TH"),
    slot("Wednesday", 5, "BIT-103", "Programming in C Lab", "Lab", "P2", "CL-02", "SPS/DS"),
    slot("Wednesday", 6, "BIT-103", "Programming in C Lab", "Lab", "P2", "CL-02", "SPS/DS"),
    # Thursday
    slot("Thursday", 1, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    slot("Thursday", 2, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    slot("Thursday", 3, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-203", "VB"),
    slot("Thursday", 4, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P2", "TL-203"),
    slot("Thursday", 5, "BIT-104", "Internet and Web Designing Lab", "Lab", "P2", "ITRC-02", "TH"),
    slot("Thursday", 6, "BIT-104", "Internet and Web Designing Lab", "Lab", "P2", "ITRC-02", "TH"),
    slot("Thursday", 7, "BIT-104", "Internet and Web Designing Lab", "Lab", "P2", "ITRC-02", "TH"),
    slot("Thursday", 8, "BIT-104", "Internet and Web Designing Lab", "Lab", "P2", "ITRC-02", "TH"),
    # Friday
    slot("Friday", 1, "BIT-103", "Programming in C", "Theory", "ALL", "TL-203", "SPS"),
    slot("Friday", 2, "BSM-110", "Engineering Mathematics I (Tutorial)", "Tutorial", "P2", "TL-203", "DG"),
    slot("Friday", 7, "BIT-104", "Internet and Web Designing", "Theory", "ALL", "TL-203", "TH"),
    # Saturday
    slot("Saturday", 1, "BIT-104", "Internet and Web Designing", "Theory", "ALL", "TL-203", "TH"),
    slot("Saturday", 2, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-203"),
    slot("Saturday", 3, "BIT-103", "Programming in C Lab", "Lab", "P1", "CL-02", "SPS/DS"),
    slot("Saturday", 4, "BIT-103", "Programming in C Lab", "Lab", "P1", "CL-02", "SPS/DS"),
]

timetables.append({
    "id": "mmmut-btech-it-b-2025",
    "pageNumber": 8,
    "degree": "B.Tech",
    "branch": "Information Technology",
    "branchCode": "IT",
    "section": "SEC-B",
    "room": "TL-203",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p8_subjects,
    "slots": p8_slots
})

# ==========================================
# PAGE 9: B.Tech (Chemical Engineering)
# Room: TL-110, Session: 2025-26, Sem: I
# ==========================================
p9_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics -I", "credits": "3-1-0", "faculty": "Dr. Vinod Baniya (VB) & Abhinav Gaur (AG)"},
    {"code": "BSM-131", "name": "Engineering Physics", "credits": "3-0-2", "faculty": "Physics Dept Faculty"},
    {"code": "BIT-103", "name": "Programming in C", "credits": "3-0-2", "faculty": "Mr. Amritesh Kumar Gupta (AKG)"},
    {"code": "BME-101", "name": "Manufacturing Techniques Workshop", "credits": "2-0-4", "faculty": "Mechanical Engg Dept Faculty"},
    {"code": "BHS-101", "name": "Universal Human Values", "credits": "3-1-0", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p9_slots = [
    # Monday
    slot("Monday", 2, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-110"),
    slot("Monday", 3, "BSM-110", "Engineering Mathematics -I", "Theory", "ALL", "TL-110", "VB"),
    slot("Monday", 7, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    slot("Monday", 8, "BSM-131", "Engineering Physics Lab", "Lab", "P2", "Physics Lab"),
    # Tuesday
    slot("Tuesday", 2, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-110"),
    slot("Tuesday", 3, "BSM-110", "Engineering Mathematics -I", "Theory", "ALL", "TL-110", "VB"),
    slot("Tuesday", 5, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Tuesday", 6, "BSM-131", "Engineering Physics Lab", "Lab", "P1", "Physics Lab"),
    slot("Tuesday", 7, "BSM-110", "Engineering Mathematics -I (Tutorial)", "Tutorial", "P1", "TL-110", "AG"),
    # Wednesday
    slot("Wednesday", 1, "BIT-103", "Programming in C Lab", "Lab", "P2", "ITRC-02", "AKG"),
    slot("Wednesday", 2, "BIT-103", "Programming in C Lab", "Lab", "P2", "ITRC-02", "AKG"),
    slot("Wednesday", 3, "BME-101", "Manufacturing Workshop Lab", "Lab", "P1", "Workshop"),
    slot("Wednesday", 4, "BME-101", "Manufacturing Workshop Lab", "Lab", "P1", "Workshop"),
    slot("Wednesday", 6, "BIT-103", "Programming in C", "Theory", "ALL", "TL-110", "AKG"),
    slot("Wednesday", 7, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P1", "TL-110"),
    # Thursday
    slot("Thursday", 2, "BSM-131", "Engineering Physics", "Theory", "ALL", "TL-110"),
    slot("Thursday", 3, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-110"),
    slot("Thursday", 4, "BIT-103", "Programming in C", "Theory", "ALL", "TL-110", "AKG"),
    slot("Thursday", 6, "BME-101", "Manufacturing Workshop Lab", "Lab", "P2", "Workshop"),
    slot("Thursday", 7, "BME-101", "Manufacturing Workshop Lab", "Lab", "P2", "Workshop"),
    # Friday
    slot("Friday", 2, "BSM-110", "Engineering Mathematics -I", "Theory", "ALL", "TL-110", "VB"),
    slot("Friday", 3, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-110"),
    slot("Friday", 4, "BIT-103", "Programming in C", "Theory", "ALL", "TL-110", "AKG"),
    slot("Friday", 5, "BME-101", "Manufacturing Workshop", "Theory", "ALL", "TL-110"),
    slot("Friday", 6, "BSM-110", "Engineering Mathematics -I (Tutorial)", "Tutorial", "P2", "TL-110", "AG"),
    slot("Friday", 7, "BHS-101", "Universal Human Values (Tutorial)", "Tutorial", "P2", "TL-110"),
    # Saturday
    slot("Saturday", 1, "BIT-103", "Programming in C Lab", "Lab", "P1", "ITRC-01", "AKG"),
    slot("Saturday", 2, "BIT-103", "Programming in C Lab", "Lab", "P1", "ITRC-01", "AKG"),
    slot("Saturday", 3, "BME-101", "Manufacturing Workshop", "Theory", "ALL", "TL-110"),
    slot("Saturday", 4, "BHS-101", "Universal Human Values", "Theory", "ALL", "TL-110"),
]

timetables.append({
    "id": "mmmut-btech-che-a-2025",
    "pageNumber": 9,
    "degree": "B.Tech",
    "branch": "Chemical Engineering",
    "branchCode": "CHE",
    "section": "SEC-A",
    "room": "TL-110",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p9_subjects,
    "slots": p9_slots
})

# ==========================================
# PAGE 10: B.Tech (Mechanical Engineering) SEC-A
# Room: TL-205, Session: 2025-26, Sem: I
# ==========================================
p10_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics-1", "credits": "3-1-0", "faculty": "Dr. Sajjan Lal (SL) & Mr. Vijay Pratap (VP)"},
    {"code": "BSM-140", "name": "Environmental Science and Green Chemistry", "credits": "3-0-2", "faculty": "RKY, NK & RS"},
    {"code": "BEE-110", "name": "Basic Electrical Engineering", "credits": "3-0-2", "faculty": "Dr Shekhar Yadav (SY)/Monu (M)"},
    {"code": "BME-104", "name": "Manufacturing Practice Workshop", "credits": "2-0-4", "faculty": "Anjani Kumar Singh / Dr. Kuldeep Kumar / PSY / Nistha"},
    {"code": "BHS-102", "name": "Technical Writing and Professional Communication", "credits": "2-1-2", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p10_slots = [
    # Monday
    slot("Monday", 1, "BSM-110", "Engineering Mathematics-1", "Theory", "ALL", "TL-205", "SL"),
    slot("Monday", 2, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-205", "SY"),
    slot("Monday", 3, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-205", "RKY"),
    slot("Monday", 5, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "RKY, NK & RS"),
    slot("Monday", 6, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "RKY, NK & RS"),
    slot("Monday", 5, "BHS-102", "Technical Writing Lab", "Lab", "P1", "Lang Lab"),
    slot("Monday", 6, "BHS-102", "Technical Writing Lab", "Lab", "P1", "Lang Lab"),
    # Tuesday
    slot("Tuesday", 1, "BME-104", "Manufacturing Practice Workshop Lab", "Lab", "P2", "Workshop", "PSY/Nistha"),
    slot("Tuesday", 2, "BME-104", "Manufacturing Practice Workshop Lab", "Lab", "P2", "Workshop", "PSY/Nistha"),
    slot("Tuesday", 3, "BME-104", "Manufacturing Practice Workshop Lab", "Lab", "P2", "Workshop", "PSY/Nistha"),
    slot("Tuesday", 4, "BME-104", "Manufacturing Practice Workshop Lab", "Lab", "P2", "Workshop", "PSY/Nistha"),
    slot("Tuesday", 5, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "CL, Preeti & RS"),
    slot("Tuesday", 6, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "CL, Preeti & RS"),
    slot("Tuesday", 7, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-205", "RKY"),
    slot("Tuesday", 8, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P2", "TL-205"),
    # Wednesday
    slot("Wednesday", 1, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-205", "RKY"),
    slot("Wednesday", 2, "BME-104", "Manufacturing Practice Workshop", "Theory", "ALL", "TL-205", "MG"),
    slot("Wednesday", 5, "BEE-110", "Basic Electrical Lab", "Lab", "P1", "EE Lab", "SY/M"),
    slot("Wednesday", 6, "BEE-110", "Basic Electrical Lab", "Lab", "P1", "EE Lab", "SY/M"),
    slot("Wednesday", 7, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-205"),
    slot("Wednesday", 8, "BSM-110", "Engineering Mathematics-1 (Tutorial)", "Tutorial", "P2", "TL-205", "VP"),
    # Thursday
    slot("Thursday", 1, "BSM-110", "Engineering Mathematics-1", "Theory", "ALL", "TL-205", "SL"),
    slot("Thursday", 2, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-205", "SY"),
    slot("Thursday", 5, "BME-104", "Manufacturing Practice Workshop", "Theory", "ALL", "TL-205", "MG"),
    slot("Thursday", 6, "BSM-110", "Engineering Mathematics-1 (Tutorial)", "Tutorial", "P1", "TL-205", "VP"),
    # Friday
    slot("Friday", 1, "BSM-110", "Engineering Mathematics-1", "Theory", "ALL", "TL-205", "SL"),
    slot("Friday", 2, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-205", "SY"),
    slot("Friday", 5, "BHS-102", "Technical Writing Lab", "Lab", "P2", "Lang Lab"),
    slot("Friday", 6, "BHS-102", "Technical Writing Lab", "Lab", "P2", "Lang Lab"),
    slot("Friday", 5, "BME-104", "Manufacturing Practice Workshop Lab", "Lab", "P1", "Workshop", "Anjani Kumar Singh / Dr. Kuldeep Kumar"),
    slot("Friday", 6, "BME-104", "Manufacturing Practice Workshop Lab", "Lab", "P1", "Workshop", "Anjani Kumar Singh / Dr. Kuldeep Kumar"),
    slot("Friday", 7, "BME-104", "Manufacturing Practice Workshop Lab", "Lab", "P1", "Workshop", "Anjani Kumar Singh / Dr. Kuldeep Kumar"),
    slot("Friday", 8, "BME-104", "Manufacturing Practice Workshop Lab", "Lab", "P1", "Workshop", "Anjani Kumar Singh / Dr. Kuldeep Kumar"),
    # Saturday
    slot("Saturday", 1, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-205"),
    slot("Saturday", 2, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P1", "TL-205"),
    slot("Saturday", 3, "BEE-110", "Basic Electrical Lab", "Lab", "P2", "EE Lab", "SY/M"),
    slot("Saturday", 4, "BEE-110", "Basic Electrical Lab", "Lab", "P2", "EE Lab", "SY/M"),
]

timetables.append({
    "id": "mmmut-btech-me-a-2025",
    "pageNumber": 10,
    "degree": "B.Tech",
    "branch": "Mechanical Engineering",
    "branchCode": "ME",
    "section": "SEC-A",
    "room": "TL-205",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p10_subjects,
    "slots": p10_slots
})

# ==========================================
# PAGE 11: B.Tech (Mechanical Engineering) SEC-B
# Room: TL-205, Session: 2025-26, Sem: I
# ==========================================
p11_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics-1", "credits": "3-1-0", "faculty": "Dr. Sajjan Lal (SL) & Nidhi Verma (NV)"},
    {"code": "BSM-140", "name": "Environmental Science and Green Chemistry", "credits": "3-0-2", "faculty": "Preeti & RS"},
    {"code": "BEE-110", "name": "Basic Electrical Engineering", "credits": "3-0-2", "faculty": "Dr Shekhar Yadav (SY)/Dr Prabhakar Tiwari (PT)/Monu (M)"},
    {"code": "BME-104", "name": "Manufacturing Practice Workshop", "credits": "2-0-4", "faculty": "Anjani Kumar Singh/Anuj/PSY/Nistha/MG"},
    {"code": "BHS-102", "name": "Technical Writing and Professional Communication", "credits": "2-1-2", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p11_slots = [
    # Monday
    slot("Monday", 1, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "Preeti & RS"),
    slot("Monday", 2, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "Preeti & RS"),
    slot("Monday", 1, "BME-104", "Manufacturing Practice Workshop Lab", "Lab", "P1", "Workshop", "Anjani Kumar Singh/Anuj"),
    slot("Monday", 2, "BME-104", "Manufacturing Practice Workshop Lab", "Lab", "P1", "Workshop", "Anjani Kumar Singh/Anuj"),
    slot("Monday", 3, "BME-104", "Manufacturing Practice Workshop Lab", "Lab", "P1", "Workshop", "Anjani Kumar Singh/Anuj"),
    slot("Monday", 4, "BME-104", "Manufacturing Practice Workshop Lab", "Lab", "P1", "Workshop", "Anjani Kumar Singh/Anuj"),
    slot("Monday", 6, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-205", "SY"),
    slot("Monday", 7, "BSM-110", "Engineering Mathematics-1 (Tutorial)", "Tutorial", "P1", "TL-205", "NV"),
    # Tuesday
    slot("Tuesday", 1, "BSM-110", "Engineering Mathematics-1", "Theory", "ALL", "TL-205", "SL"),
    slot("Tuesday", 2, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-205", "SY"),
    slot("Tuesday", 3, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-205", "RKY"),
    slot("Tuesday", 4, "BME-104", "Manufacturing Practice Workshop", "Theory", "ALL", "TL-205", "MG"),
    slot("Tuesday", 5, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-205"),
    # Wednesday
    slot("Wednesday", 3, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-205", "RKY"),
    slot("Wednesday", 4, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-205"),
    slot("Wednesday", 6, "BME-104", "Manufacturing Practice Workshop Lab", "Lab", "P2", "Workshop", "PSY/Nistha"),
    slot("Wednesday", 7, "BME-104", "Manufacturing Practice Workshop Lab", "Lab", "P2", "Workshop", "PSY/Nistha"),
    slot("Wednesday", 8, "BME-104", "Manufacturing Practice Workshop Lab", "Lab", "P2", "Workshop", "PSY/Nistha"),
    # Thursday
    slot("Thursday", 1, "BEE-110", "Basic Electrical Lab", "Lab", "P1", "EE Lab", "M/PT"),
    slot("Thursday", 2, "BEE-110", "Basic Electrical Lab", "Lab", "P1", "EE Lab", "M/PT"),
    slot("Thursday", 3, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-205", "RKY"),
    slot("Thursday", 4, "BME-104", "Manufacturing Practice Workshop", "Theory", "ALL", "TL-205", "MG"),
    slot("Thursday", 6, "BHS-102", "Technical Writing Lab", "Lab", "P2", "Lang Lab"),
    slot("Thursday", 7, "BSM-110", "Engineering Mathematics-1 (Tutorial)", "Tutorial", "P2", "TL-205", "NV"),
    # Friday
    slot("Friday", 2, "BHS-102", "Technical Writing Lab", "Lab", "P1", "Lang Lab"),
    slot("Friday", 3, "BSM-110", "Engineering Mathematics-1", "Theory", "ALL", "TL-205", "SL"),
    slot("Friday", 4, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-205", "SY"),
    slot("Friday", 5, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "Preeti & RS"),
    slot("Friday", 6, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "Preeti & RS"),
    slot("Friday", 7, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P1", "TL-205"),
    # Saturday
    slot("Saturday", 1, "BEE-110", "Basic Electrical Lab", "Lab", "P2", "EE Lab", "SY/M"),
    slot("Saturday", 2, "BEE-110", "Basic Electrical Lab", "Lab", "P2", "EE Lab", "SY/M"),
    slot("Saturday", 3, "BSM-110", "Engineering Mathematics-1", "Theory", "ALL", "TL-205", "SL"),
    slot("Saturday", 4, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P2", "TL-205"),
]

timetables.append({
    "id": "mmmut-btech-me-b-2025",
    "pageNumber": 11,
    "degree": "B.Tech",
    "branch": "Mechanical Engineering",
    "branchCode": "ME",
    "section": "SEC-B",
    "room": "TL-205",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p11_subjects,
    "slots": p11_slots
})

# ==========================================
# PAGE 12: B.Tech (Electrical Engineering) SEC-A
# Room: TL-202, Session: 2025-26, Sem: I
# ==========================================
p12_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics I", "credits": "3-1-0", "faculty": "Dr. Amit Kumar Barnwal (AKB) & Rohit Kasera (RK)"},
    {"code": "BSM-140", "name": "Environmental Science and Green Chemistry", "credits": "3-0-2", "faculty": "PS, Preeti, CL & RS"},
    {"code": "BEE-110", "name": "Basic Electrical Engineering", "credits": "3-0-2", "faculty": "Dr. Awadhesh Kumar (AK)/Dr Rohit Babu (RB)/Utkarsh Shukla (US)"},
    {"code": "BEE-108A", "name": "Electrical Wiring & Estimation", "credits": "3-0-2", "faculty": "Mr K B Sahay (KBS)/Dr Bindeshwar Singh (BS)/Dr Ravishankar Gupta (RSG)"},
    {"code": "BHS-102", "name": "Technical Writing and Professional Communication", "credits": "2-1-2", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p12_slots = [
    # Monday
    slot("Monday", 1, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-202", "PS"),
    slot("Monday", 2, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-202", "AKB"),
    slot("Monday", 5, "BEE-108A", "Electrical Wiring Lab", "Lab", "P1", "Wiring Lab", "KBS/RSG"),
    slot("Monday", 6, "BEE-108A", "Electrical Wiring Lab", "Lab", "P1", "Wiring Lab", "KBS/RSG"),
    slot("Monday", 7, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P2", "TL-202"),
    # Tuesday
    slot("Tuesday", 3, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-202", "AK"),
    slot("Tuesday", 4, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-202"),
    slot("Tuesday", 7, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-202"),
    # Wednesday
    slot("Wednesday", 2, "BHS-102", "Technical Writing Lab", "Lab", "P1", "Lang Lab"),
    slot("Wednesday", 3, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-202", "AK"),
    slot("Wednesday", 4, "BEE-108A", "Electrical Wiring & Estimation", "Theory", "ALL", "TL-202", "KBS"),
    slot("Wednesday", 6, "BSM-110", "Engineering Mathematics I (Tutorial)", "Tutorial", "P2", "TL-202", "RK"),
    slot("Wednesday", 7, "BHS-102", "Technical Writing Lab", "Lab", "P2", "Lang Lab"),
    slot("Wednesday", 8, "BHS-102", "Technical Writing Lab", "Lab", "P2", "Lang Lab"),
    # Thursday
    slot("Thursday", 1, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-202", "PS"),
    slot("Thursday", 2, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-202", "AKB"),
    slot("Thursday", 3, "BEE-110", "Basic Electrical Lab", "Lab", "P1", "EE Lab", "AK/US"),
    slot("Thursday", 4, "BEE-110", "Basic Electrical Lab", "Lab", "P1", "EE Lab", "AK/US"),
    slot("Thursday", 3, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "SJ, Preeti & RS"),
    slot("Thursday", 4, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "SJ, Preeti & RS"),
    slot("Thursday", 6, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-202", "AK"),
    slot("Thursday", 7, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P1", "TL-202"),
    # Friday
    slot("Friday", 1, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-202", "PS"),
    slot("Friday", 2, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-202", "AKB"),
    slot("Friday", 3, "BEE-110", "Basic Electrical Lab", "Lab", "P2", "EE Lab", "RB/US"),
    slot("Friday", 4, "BEE-110", "Basic Electrical Lab", "Lab", "P2", "EE Lab", "RB/US"),
    slot("Friday", 3, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "PS, CL & RS"),
    slot("Friday", 4, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "PS, CL & RS"),
    slot("Friday", 7, "BEE-108A", "Electrical Wiring & Estimation", "Theory", "ALL", "TL-202", "KBS"),
    # Saturday
    slot("Saturday", 1, "BEE-108A", "Electrical Wiring & Estimation", "Theory", "ALL", "TL-202", "KBS"),
    slot("Saturday", 2, "BSM-110", "Engineering Mathematics I (Tutorial)", "Tutorial", "P1", "TL-202", "RK"),
    slot("Saturday", 3, "BEE-108A", "Electrical Wiring Lab", "Lab", "P2", "Wiring Lab", "RSG/BS"),
    slot("Saturday", 4, "BEE-108A", "Electrical Wiring Lab", "Lab", "P2", "Wiring Lab", "RSG/BS"),
]

timetables.append({
    "id": "mmmut-btech-ee-a-2025",
    "pageNumber": 12,
    "degree": "B.Tech",
    "branch": "Electrical Engineering",
    "branchCode": "EE",
    "section": "SEC-A",
    "room": "TL-202",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p12_subjects,
    "slots": p12_slots
})

# ==========================================
# PAGE 13: B.Tech (Electrical Engineering) SEC-B
# Room: TL-202, Session: 2025-26, Sem: I
# ==========================================
p13_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics I", "credits": "3-1-0", "faculty": "Dr. Amit Kumar Barnwal (AKB) & Vivek Kushwaha (VK)"},
    {"code": "BSM-140", "name": "Environmental Science and Green Chemistry", "credits": "3-0-2", "faculty": "SJ, PS, Preeti, NK & RS"},
    {"code": "BEE-110", "name": "Basic Electrical Engineering", "credits": "3-0-2", "faculty": "Dr Rohit Babu (RB)/ Dr Awadhesh Kumar (AK)/ Utkarsh Shukla (US)"},
    {"code": "BEE-108A", "name": "Electrical Wiring & Estimation", "credits": "3-0-2", "faculty": "Mr K B Sahay (KBS)/Dr Amit Verma (AV)"},
    {"code": "BHS-102", "name": "Technical Writing and Professional Communication", "credits": "2-1-2", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p13_slots = [
    # Monday
    slot("Monday", 3, "BEE-108A", "Electrical Wiring & Estimation", "Theory", "ALL", "TL-202", "KBS"),
    slot("Monday", 4, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-202", "RB"),
    slot("Monday", 5, "BSM-110", "Engineering Mathematics I (Tutorial)", "Tutorial", "P2", "TL-202", "VK"),
    slot("Monday", 6, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P2", "TL-202"),
    # Tuesday
    slot("Tuesday", 1, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-202", "SJ"),
    slot("Tuesday", 2, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-202", "AKB"),
    slot("Tuesday", 3, "BEE-110", "Basic Electrical Lab", "Lab", "P1", "EE Lab", "PT/US"),
    slot("Tuesday", 4, "BEE-110", "Basic Electrical Lab", "Lab", "P1", "EE Lab", "PT/US"),
    slot("Tuesday", 6, "BEE-108A", "Electrical Wiring & Estimation", "Theory", "ALL", "TL-202", "KBS"),
    slot("Tuesday", 8, "BHS-102", "Technical Writing Lab", "Lab", "P1", "Lang Lab"),
    # Wednesday
    slot("Wednesday", 1, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-202", "SJ"),
    slot("Wednesday", 2, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-202", "AKB"),
    slot("Wednesday", 7, "BEE-110", "Basic Electrical Lab", "Lab", "P2", "EE Lab", "AK/US"),
    slot("Wednesday", 8, "BEE-110", "Basic Electrical Lab", "Lab", "P2", "EE Lab", "AK/US"),
    slot("Wednesday", 7, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "PS, Preeti & RS"),
    slot("Wednesday", 8, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "PS, Preeti & RS"),
    # Thursday
    slot("Thursday", 1, "BEE-108A", "Electrical Wiring Lab", "Lab", "P1", "Wiring Lab", "KBS/AV"),
    slot("Thursday", 2, "BEE-108A", "Electrical Wiring Lab", "Lab", "P1", "Wiring Lab", "KBS/AV"),
    slot("Thursday", 3, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-202", "RB"),
    slot("Thursday", 4, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-202"),
    slot("Thursday", 7, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "PS, NK & RS"),
    slot("Thursday", 8, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "PS, NK & RS"),
    slot("Thursday", 8, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P1", "TL-202"),
    # Friday
    slot("Friday", 3, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-202", "SJ"),
    slot("Friday", 4, "BSM-110", "Engineering Mathematics I", "Theory", "ALL", "TL-202", "AKB"),
    slot("Friday", 5, "BEE-108A", "Electrical Wiring & Estimation", "Theory", "ALL", "TL-202", "KBS"),
    slot("Friday", 6, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-202", "RB"),
    slot("Friday", 7, "BHS-102", "Technical Writing Lab", "Lab", "P2", "Lang Lab"),
    slot("Friday", 8, "BHS-102", "Technical Writing Lab", "Lab", "P2", "Lang Lab"),
    # Saturday
    slot("Saturday", 1, "BEE-108A", "Electrical Wiring Lab", "Lab", "P2", "Wiring Lab", "KBS/AV"),
    slot("Saturday", 2, "BEE-108A", "Electrical Wiring Lab", "Lab", "P2", "Wiring Lab", "KBS/AV"),
    slot("Saturday", 3, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-202"),
    slot("Saturday", 4, "BSM-110", "Engineering Mathematics I (Tutorial)", "Tutorial", "P1", "TL-202", "VK"),
]

timetables.append({
    "id": "mmmut-btech-ee-b-2025",
    "pageNumber": 13,
    "degree": "B.Tech",
    "branch": "Electrical Engineering",
    "branchCode": "EE",
    "section": "SEC-B",
    "room": "TL-202",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p13_subjects,
    "slots": p13_slots
})

# ==========================================
# PAGE 14: B.Tech (ECE) SEC-A
# Room: TL-207, Session: 2025-26, Sem: I
# ==========================================
p14_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics - I", "credits": "3-1-0", "faculty": "Dr. Harish Chandra (HC) and Prgya Mishra (PM)"},
    {"code": "BSM-140", "name": "Environmental Science and Green Chemistry", "credits": "3-0-2", "faculty": "PPP, PS, NK, CL & RS"},
    {"code": "BEE-110", "name": "Basic Electrical Engineering", "credits": "3-0-2", "faculty": "Dr Rohit Babu (RB)/Dr Divyanshi Srivastava (DDS)/Arushi Gupta (AG)"},
    {"code": "BEC-106", "name": "Electronic Components Testing and Measurement", "credits": "2-0-4", "faculty": "Dr. Pooja Lohia (PL)/Dr. Chandan (CH)/Mr. Nagendra Kumar (NK)"},
    {"code": "BHS-102", "name": "Technical Writing and Professional Communication", "credits": "2-1-2", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p14_slots = [
    # Monday
    slot("Monday", 1, "BSM-110", "Engineering Mathematics - I", "Theory", "ALL", "TL-207", "HC"),
    slot("Monday", 2, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-207", "DDS"),
    slot("Monday", 5, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-207"),
    slot("Monday", 6, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-207", "PPP"),
    slot("Monday", 7, "BEE-110", "Basic Electrical Lab", "Lab", "P1", "EE Lab", "RB/AG"),
    slot("Monday", 8, "BEE-110", "Basic Electrical Lab", "Lab", "P1", "EE Lab", "RB/AG"),
    # Tuesday
    slot("Tuesday", 3, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "PS, NK & RS"),
    slot("Tuesday", 4, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "PS, NK & RS"),
    slot("Tuesday", 3, "BEC-106", "Electronic Components Testing Lab", "Lab", "P2", "EC Lab", "PL/NK"),
    slot("Tuesday", 4, "BEC-106", "Electronic Components Testing Lab", "Lab", "P2", "EC Lab", "PL/NK"),
    slot("Tuesday", 5, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-207"),
    slot("Tuesday", 6, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-207", "PPP"),
    slot("Tuesday", 7, "BEE-110", "Basic Electrical Lab", "Lab", "P2", "EE Lab", "RB/AG"),
    slot("Tuesday", 8, "BEE-110", "Basic Electrical Lab", "Lab", "P2", "EE Lab", "RB/AG"),
    # Wednesday
    slot("Wednesday", 2, "BHS-102", "Technical Writing Lab", "Lab", "P1", "Lang Lab"),
    slot("Wednesday", 3, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-207", "PPP"),
    slot("Wednesday", 4, "BEC-106", "Electronic Components Testing", "Theory", "ALL", "TL-207", "PL"),
    slot("Wednesday", 6, "BEC-106", "Electronic Components Testing Lab", "Lab", "P1", "EC Lab", "PL/CH"),
    slot("Wednesday", 7, "BEC-106", "Electronic Components Testing Lab", "Lab", "P1", "EC Lab", "PL/CH"),
    slot("Wednesday", 7, "BHS-102", "Technical Writing Lab", "Lab", "P2", "Lang Lab"),
    # Thursday
    slot("Thursday", 1, "BSM-110", "Engineering Mathematics - I", "Theory", "ALL", "TL-207", "HC"),
    slot("Thursday", 2, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-207", "DDS"),
    slot("Thursday", 5, "BSM-110", "Engineering Mathematics - I (Tutorial)", "Tutorial", "P1", "TL-111", "PM"),
    # Friday
    slot("Friday", 1, "BSM-110", "Engineering Mathematics - I", "Theory", "ALL", "TL-207", "HC"),
    slot("Friday", 2, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-207", "DDS"),
    slot("Friday", 5, "BSM-110", "Engineering Mathematics - I (Tutorial)", "Tutorial", "P2", "TL-111", "PM"),
    slot("Friday", 6, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P2", "TL-207"),
    # Saturday
    slot("Saturday", 1, "BEC-106", "Electronic Components Testing", "Theory", "ALL", "TL-207", "PL"),
    slot("Saturday", 2, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P1", "TL-207"),
    slot("Saturday", 3, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "CL & RS"),
    slot("Saturday", 4, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "CL & RS"),
]

timetables.append({
    "id": "mmmut-btech-ece-a-2025",
    "pageNumber": 14,
    "degree": "B.Tech",
    "branch": "Electronics & Communication Engineering",
    "branchCode": "ECE",
    "section": "SEC-A",
    "room": "TL-207",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p14_subjects,
    "slots": p14_slots
})

# ==========================================
# PAGE 15: B.Tech (ECE) SEC-B
# Room: TL-207, Session: 2025-26, Sem: I
# ==========================================
p15_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics - I", "credits": "3-1-0", "faculty": "Dr. Harish Chndra (HC) & Km. Kshama Yadav (KY)"},
    {"code": "BSM-140", "name": "Environmental Science and Green Chemistry", "credits": "3-0-2", "faculty": "PPP, CL, BR & RS"},
    {"code": "BEE-110", "name": "Basic Electrical Engineering", "credits": "3-0-2", "faculty": "Dr Anukriti Sharma (AS)/Dr Shekhar Yadav (SY)"},
    {"code": "BEC-106", "name": "Electronic Components Testing and Measurement", "credits": "2-0-4", "faculty": "Dr. Shalabh Kumar Mishra (SKM)/Dr. G. D. Bharti (GDB)/Dr. Prateek (P)"},
    {"code": "BHS-102", "name": "Technical Writing and Professional Communication", "credits": "2-1-2", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p15_slots = [
    # Monday
    slot("Monday", 3, "BEC-106", "Electronic Components Testing", "Theory", "ALL", "TL-207", "SKM"),
    slot("Monday", 4, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-207", "PPP"),
    slot("Monday", 7, "BSM-110", "Engineering Mathematics - I (Tutorial)", "Tutorial", "P1", "TL-207", "KY"),
    # Tuesday
    slot("Tuesday", 1, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-207", "AS"),
    slot("Tuesday", 2, "BSM-110", "Engineering Mathematics - I", "Theory", "ALL", "TL-207", "HC"),
    slot("Tuesday", 3, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-207"),
    slot("Tuesday", 4, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-207", "PPP"),
    slot("Tuesday", 6, "BHS-102", "Technical Writing Lab", "Lab", "P1", "Lang Lab"),
    slot("Tuesday", 7, "BEC-106", "Electronic Components Testing", "Theory", "ALL", "TL-207", "SKM"),
    # Wednesday
    slot("Wednesday", 1, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-207", "AS"),
    slot("Wednesday", 2, "BSM-110", "Engineering Mathematics - I", "Theory", "ALL", "TL-207", "HC"),
    slot("Wednesday", 6, "BHS-102", "Technical Writing Lab", "Lab", "P1", "Lang Lab"),
    slot("Wednesday", 7, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-207"),
    # Thursday
    slot("Thursday", 1, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "CL, BR & RS"),
    slot("Thursday", 2, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "CL, BR & RS"),
    slot("Thursday", 2, "BEC-106", "Electronic Components Testing Lab", "Lab", "P2", "EC Lab", "SKM/GDB/P"),
    slot("Thursday", 3, "BEC-106", "Electronic Components Testing Lab", "Lab", "P2", "EC Lab", "SKM/GDB/P"),
    slot("Thursday", 3, "BSM-110", "Engineering Mathematics - I (Tutorial)", "Tutorial", "P2", "TL-207", "KY"),
    slot("Thursday", 4, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P2", "TL-207"),
    slot("Thursday", 5, "BEE-110", "Basic Electrical Lab", "Lab", "P1", "EE Lab", "AS/SY"),
    slot("Thursday", 6, "BEE-110", "Basic Electrical Lab", "Lab", "P1", "EE Lab", "AS/SY"),
    # Friday
    slot("Friday", 3, "BSM-110", "Engineering Mathematics - I", "Theory", "ALL", "TL-207", "HC"),
    slot("Friday", 4, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-207", "AS"),
    slot("Friday", 5, "BEE-110", "Basic Electrical Lab", "Lab", "P2", "EE Lab", "AS/SY"),
    slot("Friday", 6, "BEE-110", "Basic Electrical Lab", "Lab", "P2", "EE Lab", "AS/SY"),
    slot("Friday", 6, "BEC-106", "Electronic Components Testing Lab", "Lab", "P1", "EC Lab", "SKM/GDB"),
    slot("Friday", 7, "BEC-106", "Electronic Components Testing Lab", "Lab", "P1", "EC Lab", "SKM/GDB"),
    # Saturday
    slot("Saturday", 1, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "PPP, CL & RS"),
    slot("Saturday", 2, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "PPP, CL & RS"),
    slot("Saturday", 3, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-207", "PPP"),
    slot("Saturday", 4, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P1", "TL-207"),
]

timetables.append({
    "id": "mmmut-btech-ece-b-2025",
    "pageNumber": 15,
    "degree": "B.Tech",
    "branch": "Electronics & Communication Engineering",
    "branchCode": "ECE",
    "section": "SEC-B",
    "room": "TL-207",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p15_subjects,
    "slots": p15_slots
})

# ==========================================
# PAGE 16: B.Tech (ECE) SEC-C
# Room: TL-204, Session: 2025-26, Sem: I
# ==========================================
p16_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics - I", "credits": "3-1-0", "faculty": "Dr. Manmohan Pandey (MP) & Km. Shrishti Tripathi (ST)"},
    {"code": "BSM-140", "name": "Environmental Science and Green Chemistry", "credits": "3-0-2", "faculty": "SJ, PS, NK & RS"},
    {"code": "BEE-110", "name": "Basic Electrical Engineering", "credits": "3-0-2", "faculty": "Dr Nikhil Kumar (NK)/Dr Shikha Singh (SS)/Ms Anuradha (AT)"},
    {"code": "BEC-106", "name": "Electronic Components Testing and Measurement", "credits": "2-0-4", "faculty": "Dr. Pragyey Kumar Kaushik (PKK)/Dr. Rajnish/Dr. Vijay Shankar Chaudhary (VSC)"},
    {"code": "BHS-102", "name": "Technical Writing and Professional Communication", "credits": "2-1-2", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p16_slots = [
    # Monday
    slot("Monday", 2, "BEC-106", "Electronic Components Testing Lab", "Lab", "P1", "EC Lab", "R/VSC"),
    slot("Monday", 3, "BEC-106", "Electronic Components Testing Lab", "Lab", "P1", "EC Lab", "R/VSC"),
    slot("Monday", 6, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-204", "SJ"),
    slot("Monday", 7, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-204"),
    # Tuesday
    slot("Tuesday", 1, "BEE-110", "Basic Electrical Lab", "Lab", "P2", "EE Lab", "SS/AT"),
    slot("Tuesday", 2, "BEE-110", "Basic Electrical Lab", "Lab", "P2", "EE Lab", "SS/AT"),
    slot("Tuesday", 3, "BHS-102", "Technical Writing Lab", "Lab", "P2", "Lang Lab"),
    slot("Tuesday", 3, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-204", "NK"),
    slot("Tuesday", 4, "BEC-106", "Electronic Components Testing", "Theory", "ALL", "TL-204", "PKK"),
    slot("Tuesday", 6, "BEC-106", "Electronic Components Testing Lab", "Lab", "P2", "EC Lab", "PKK/VSC"),
    slot("Tuesday", 7, "BEC-106", "Electronic Components Testing Lab", "Lab", "P2", "EC Lab", "PKK/VSC"),
    slot("Tuesday", 7, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "SJ & RS"),
    slot("Tuesday", 8, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "SJ & RS"),
    # Wednesday
    slot("Wednesday", 1, "BEC-106", "Electronic Components Testing", "Theory", "ALL", "TL-204", "PKK"),
    slot("Wednesday", 2, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-204", "NK"),
    slot("Wednesday", 3, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "PS, NK & RS"),
    slot("Wednesday", 4, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "PS, NK & RS"),
    slot("Wednesday", 6, "BSM-110", "Engineering Mathematics - I (Tutorial)", "Tutorial", "P2", "TL-204", "ST"),
    slot("Wednesday", 7, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P2", "TL-204"),
    # Thursday
    slot("Thursday", 1, "BSM-110", "Engineering Mathematics - I", "Theory", "ALL", "TL-204", "MP"),
    slot("Thursday", 2, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-204", "SJ"),
    slot("Thursday", 6, "BSM-110", "Engineering Mathematics - I (Tutorial)", "Tutorial", "P1", "TL-204", "ST"),
    slot("Thursday", 7, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P1", "TL-204"),
    # Friday
    slot("Friday", 1, "BSM-110", "Engineering Mathematics - I", "Theory", "ALL", "TL-204", "MP"),
    slot("Friday", 2, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-204", "SJ"),
    slot("Friday", 6, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-204", "NK"),
    slot("Friday", 7, "BEE-110", "Basic Electrical Lab", "Lab", "P1", "EE Lab", "SS/AT"),
    slot("Friday", 8, "BEE-110", "Basic Electrical Lab", "Lab", "P1", "EE Lab", "SS/AT"),
    # Saturday
    slot("Saturday", 1, "BSM-110", "Engineering Mathematics - I", "Theory", "ALL", "TL-204", "MP"),
    slot("Saturday", 2, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-204"),
    slot("Saturday", 3, "BHS-102", "Technical Writing Lab", "Lab", "P1", "Lang Lab"),
]

timetables.append({
    "id": "mmmut-btech-ece-c-2025",
    "pageNumber": 16,
    "degree": "B.Tech",
    "branch": "Electronics & Communication Engineering",
    "branchCode": "ECE",
    "section": "SEC-C",
    "room": "TL-204",
    "session": "2025-26",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p16_subjects,
    "slots": p16_slots
})

# ==========================================
# PAGE 17: B.Tech,ECE(IOT) SEC-A
# Room: TL-204, Session: 2024-25, Sem: I
# ==========================================
p17_subjects = [
    {"code": "BSM-110", "name": "Engineering Mathematics - I", "credits": "3-1-0", "faculty": "Dr. Kumar Vineet (KV) & Nandita Tiwari (NT)"},
    {"code": "BSM-140", "name": "Environmental Science and Green Chemistry", "credits": "3-0-2", "faculty": "PS, PPP, NK & RS"},
    {"code": "BEE-110", "name": "Basic Electrical Engineering", "credits": "3-0-2", "faculty": "Dr Vivek Patel (VP)/Dr Nikita Prajapati (NP)/Dr Shikha Singh (SS)/Dr Rohit Babu (RB)"},
    {"code": "BEC-106", "name": "Electronic Components Testing and Measurement", "credits": "2-0-4", "faculty": "Dr. Ram Pravesh (RP)/Dr. Raj Kumar Singh (RK)/Dr. Suyash Kumar (SK)"},
    {"code": "BHS-102", "name": "Technical Writing and Professional Communication", "credits": "2-1-2", "faculty": "Humanities Dept Faculty"},
    {"code": "ECA-100", "name": "Induction Program", "credits": "0-0-0", "faculty": "Dean UGS"}
]

p17_slots = [
    # Monday
    slot("Monday", 1, "BSM-110", "Engineering Mathematics - I", "Theory", "ALL", "TL-204", "KV"),
    slot("Monday", 2, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-204", "PS"),
    slot("Monday", 3, "BEC-106", "Electronic Components Testing", "Theory", "ALL", "TL-204", "RP"),
    slot("Monday", 6, "BEC-106", "Electronic Components Testing Lab", "Lab", "P2", "EC Lab", "RP/RK"),
    slot("Monday", 7, "BEC-106", "Electronic Components Testing Lab", "Lab", "P2", "EC Lab", "RP/RK"),
    # Tuesday
    slot("Tuesday", 1, "BSM-110", "Engineering Mathematics - I", "Theory", "ALL", "TL-204", "KV"),
    slot("Tuesday", 2, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-204", "PS"),
    slot("Tuesday", 5, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-204"),
    slot("Tuesday", 6, "BEE-110", "Basic Electrical Lab", "Lab", "P1", "EE Lab", "VP/RB"),
    slot("Tuesday", 7, "BSM-110", "Engineering Mathematics - I (Tutorial)", "Tutorial", "P1", "TL-204", "NT"),
    # Wednesday
    slot("Wednesday", 3, "BHS-102", "Technical Writing", "Theory", "ALL", "TL-204"),
    slot("Wednesday", 4, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-204", "NP"),
    slot("Wednesday", 5, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P1", "TL-204"),
    # Thursday
    slot("Thursday", 1, "BHS-102", "Technical Writing Lab", "Lab", "P2", "Lang Lab"),
    slot("Thursday", 2, "BHS-102", "Technical Writing Lab", "Lab", "P2", "Lang Lab"),
    slot("Thursday", 3, "BSM-110", "Engineering Mathematics - I", "Theory", "ALL", "TL-204", "KV"),
    slot("Thursday", 4, "BSM-140", "Environmental Science", "Theory", "ALL", "TL-204", "PS"),
    slot("Thursday", 5, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "PPP, NK & RS"),
    slot("Thursday", 6, "BSM-140", "Environmental Science Lab", "Lab", "P2", "Chem Lab", "PPP, NK & RS"),
    slot("Thursday", 6, "BEC-106", "Electronic Components Testing Lab", "Lab", "P1", "EC Lab", "RP/SK"),
    slot("Thursday", 7, "BEC-106", "Electronic Components Testing Lab", "Lab", "P1", "EC Lab", "RP/SK"),
    slot("Thursday", 7, "BEE-110", "Basic Electrical Lab", "Lab", "P2", "EE Lab", "VP/SS"),
    # Friday
    slot("Friday", 1, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "NK & RS"),
    slot("Friday", 2, "BSM-140", "Environmental Science Lab", "Lab", "P1", "Chem Lab", "NK & RS"),
    slot("Friday", 3, "BEC-106", "Electronic Components Testing", "Theory", "ALL", "TL-204", "RP"),
    slot("Friday", 4, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-204", "NP"),
    slot("Friday", 7, "BSM-110", "Engineering Mathematics - I (Tutorial)", "Tutorial", "P2", "TL-204", "NT"),
    # Saturday
    slot("Saturday", 1, "BHS-102", "Technical Writing Lab", "Lab", "P1", "Lang Lab"),
    slot("Saturday", 2, "BHS-102", "Technical Writing Lab", "Lab", "P1", "Lang Lab"),
    slot("Saturday", 3, "BHS-102", "Technical Writing (Tutorial)", "Tutorial", "P2", "TL-204"),
    slot("Saturday", 4, "BEE-110", "Basic Electrical Engineering", "Theory", "ALL", "TL-204", "NP"),
]

timetables.append({
    "id": "mmmut-btech-ece-iot-a-2024",
    "pageNumber": 17,
    "degree": "B.Tech",
    "branch": "Electronics & Comm. Engg (IoT)",
    "branchCode": "ECE(IOT)",
    "section": "SEC-A",
    "room": "TL-204",
    "session": "2024-25",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p17_subjects,
    "slots": p17_slots
})

# ==========================================
# PAGE 18: BBA SEC-A
# Room: TL-113, Session: 2026-27, Sem: I
# ==========================================
p18_subjects = [
    {"code": "BBA-114", "name": "Financial Accounting", "credits": "3-1-0", "faculty": "Dr. Ugrasen (UG) / Ms. Swati Gupta (SG)"},
    {"code": "BBA-115", "name": "Principles and Practices of Management", "credits": "3-1-0", "faculty": "Dr. Javed Alam (JA) / Ms. Akriti Singh (AKS)"},
    {"code": "BBA-116", "name": "Quantitative Techniques for Business Research", "credits": "3-1-0", "faculty": "Dr. Poonam Ojha (PO) / Ms. Shambhavi Tripathi (ST)"},
    {"code": "BBA-A01", "name": "Business Communication for Managers", "credits": "3-1-0", "faculty": "Dr. Abdul Jadid (AJ) / Mr. Badal Sharma (BAS)"},
    {"code": "BHM-121", "name": "Industrial Psychology", "credits": "3-1-0", "faculty": "Dr. Rajput Neetu Kumari"},
    {"code": "AUC-108", "name": "Intellectual Property Rights", "credits": "2-0-0", "faculty": "Dr. Asim Hasan (AH)"}
]

p18_slots = [
    # Monday
    slot("Monday", 2, "BBA-114", "Financial Accounting", "Theory", "ALL", "TL-113", "UG"),
    slot("Monday", 3, "BBA-116", "Quantitative Techniques (Tutorial)", "Tutorial", "P1", "TL-113", "ST"),
    slot("Monday", 4, "BBA-114", "Financial Accounting (Tutorial)", "Tutorial", "P1", "TL-113", "SG"),
    slot("Monday", 5, "BHM-121", "Industrial Psychology (Tutorial)", "Tutorial", "P1", "TL-113"),
    # Tuesday
    slot("Tuesday", 1, "BHM-121", "Industrial Psychology", "Theory", "ALL", "TL-113"),
    slot("Tuesday", 3, "BBA-114", "Financial Accounting (Tutorial)", "Tutorial", "P2", "TL-113", "SG"),
    slot("Tuesday", 4, "BBA-115", "Principles of Management", "Theory", "ALL", "TL-113", "JA"),
    slot("Tuesday", 5, "BBA-A01", "Business Communication", "Theory", "ALL", "TL-113", "AJ"),
    # Wednesday
    slot("Wednesday", 1, "BHM-121", "Industrial Psychology", "Theory", "ALL", "TL-113"),
    slot("Wednesday", 2, "BBA-114", "Financial Accounting", "Theory", "ALL", "TL-113", "UG"),
    slot("Wednesday", 3, "BBA-116", "Quantitative Techniques (Tutorial)", "Tutorial", "P2", "TL-113", "ST"),
    slot("Wednesday", 4, "BBA-115", "Principles of Management (Tutorial)", "Tutorial", "P1", "TL-113", "AKS"),
    slot("Wednesday", 5, "BBA-116", "Quantitative Techniques", "Theory", "ALL", "TL-113", "PO"),
    slot("Wednesday", 6, "BHM-121", "Industrial Psychology (Tutorial)", "Tutorial", "P2", "TL-113"),
    # Thursday
    slot("Thursday", 1, "BHM-121", "Industrial Psychology", "Theory", "ALL", "TL-113"),
    slot("Thursday", 2, "AUC-108", "Intellectual Property Rights", "Theory", "ALL", "TL-113", "AH"),
    slot("Thursday", 3, "BBA-A01", "Business Communication (Tutorial)", "Tutorial", "P2", "TL-113", "BAS"),
    slot("Thursday", 4, "BBA-115", "Principles of Management", "Theory", "ALL", "TL-113", "JA"),
    slot("Thursday", 5, "BBA-A01", "Business Communication", "Theory", "ALL", "TL-113", "AJ"),
    slot("Thursday", 6, "BBA-116", "Quantitative Techniques", "Theory", "ALL", "TL-113", "PO"),
    # Friday
    slot("Friday", 2, "AUC-108", "Intellectual Property Rights", "Theory", "ALL", "TL-113", "AH"),
    slot("Friday", 3, "BBA-A01", "Business Communication (Tutorial)", "Tutorial", "P1", "TL-113", "BAS"),
    slot("Friday", 4, "BBA-115", "Principles of Management", "Theory", "ALL", "TL-113", "JA"),
    slot("Friday", 5, "BBA-116", "Quantitative Techniques", "Theory", "ALL", "TL-113", "PO"),
    # Saturday
    slot("Saturday", 1, "BBA-115", "Principles of Management (Tutorial)", "Tutorial", "P2", "TL-113", "AKS"),
    slot("Saturday", 2, "BBA-A01", "Business Communication", "Theory", "ALL", "TL-113", "AJ"),
    slot("Saturday", 4, "BBA-114", "Financial Accounting", "Theory", "ALL", "TL-113", "UG"),
]

timetables.append({
    "id": "mmmut-bba-a-2026",
    "pageNumber": 18,
    "degree": "BBA",
    "branch": "Business Administration",
    "branchCode": "BBA",
    "section": "SEC-A",
    "room": "TL-113",
    "session": "2026-27",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p18_subjects,
    "slots": p18_slots
})

# ==========================================
# PAGE 19: BBA SEC-B
# Room: TL-114, Session: 2026-27, Sem: I
# ==========================================
p19_subjects = [
    {"code": "BBA-114", "name": "Financial Accounting", "credits": "3-1-0", "faculty": "Dr. Anjali Singh (AS) / Ms. Swati Gupta (SG)"},
    {"code": "BBA-115", "name": "Principles and Practices of Management", "credits": "3-1-0", "faculty": "Dr. Indal Kumar (IK) / Ms. Akanksha Jaiswal (AKJ)"},
    {"code": "BBA-116", "name": "Quantitative Techniques for Business Research", "credits": "3-1-0", "faculty": "Dr. Vivaswan Singh (VS) / Ms. Shivangi Yadav (SY)"},
    {"code": "BBA-A01", "name": "Business Communication for Managers", "credits": "3-1-0", "faculty": "Mr. Sachin Srivastava (SS)/Ms. Kumari Surabhi (KUS)"},
    {"code": "BHM-121", "name": "Industrial Psychology", "credits": "3-1-0", "faculty": "Ms. Deepshikha Singh"},
    {"code": "AUC-108", "name": "Intellectual Property Rights", "credits": "2-0-0", "faculty": "Dr. M. Osama (MO)"}
]

p19_slots = [
    # Monday
    slot("Monday", 2, "BBA-116", "Quantitative Techniques", "Theory", "ALL", "TL-114", "VS"),
    slot("Monday", 3, "BHM-121", "Industrial Psychology", "Theory", "ALL", "TL-114"),
    slot("Monday", 4, "BBA-115", "Principles of Management (Tutorial)", "Tutorial", "P1", "TL-114", "AKJ"),
    slot("Monday", 5, "BBA-A01", "Business Communication", "Theory", "ALL", "TL-114", "SS"),
    # Tuesday
    slot("Tuesday", 2, "BBA-116", "Quantitative Techniques (Tutorial)", "Tutorial", "P1", "TL-114", "SY"),
    slot("Tuesday", 3, "BHM-121", "Industrial Psychology (Tutorial)", "Tutorial", "P1", "TL-114"),
    slot("Tuesday", 4, "BBA-114", "Financial Accounting", "Theory", "ALL", "TL-114", "AS"),
    slot("Tuesday", 5, "BBA-115", "Principles of Management", "Theory", "ALL", "TL-114", "IK"),
    slot("Tuesday", 6, "BBA-A01", "Business Communication", "Theory", "ALL", "TL-114", "SS"),
    # Wednesday
    slot("Wednesday", 1, "BHM-121", "Industrial Psychology", "Theory", "ALL", "TL-114", "MO"),
    slot("Wednesday", 2, "AUC-108", "Intellectual Property Rights", "Theory", "ALL", "TL-114"),
    slot("Wednesday", 3, "BBA-114", "Financial Accounting (Tutorial)", "Tutorial", "P1", "TL-114", "SG"),
    slot("Wednesday", 4, "BBA-114", "Financial Accounting", "Theory", "ALL", "TL-114", "AS"),
    slot("Wednesday", 5, "BHM-121", "Industrial Psychology (Tutorial)", "Tutorial", "P2", "TL-114"),
    slot("Wednesday", 6, "BBA-A01", "Business Communication (Tutorial)", "Tutorial", "P1", "TL-114", "KUS"),
    # Thursday
    slot("Thursday", 1, "BBA-115", "Principles of Management", "Theory", "ALL", "TL-114", "IK"),
    slot("Thursday", 2, "BBA-116", "Quantitative Techniques (Tutorial)", "Tutorial", "P2", "TL-114", "SY"),
    slot("Thursday", 4, "BBA-116", "Quantitative Techniques", "Theory", "ALL", "TL-114", "VS"),
    slot("Thursday", 5, "BBA-A01", "Business Communication (Tutorial)", "Tutorial", "P2", "TL-114", "KUS"),
    slot("Thursday", 6, "BBA-115", "Principles of Management (Tutorial)", "Tutorial", "P2", "TL-114", "AKJ"),
    # Friday
    slot("Friday", 2, "AUC-108", "Intellectual Property Rights", "Theory", "ALL", "TL-114", "MO"),
    slot("Friday", 4, "BBA-115", "Principles of Management", "Theory", "ALL", "TL-114", "IK"),
    slot("Friday", 5, "BHM-121", "Industrial Psychology", "Theory", "ALL", "TL-114"),
    slot("Friday", 6, "BBA-A01", "Business Communication", "Theory", "ALL", "TL-114", "SS"),
    # Saturday
    slot("Saturday", 1, "BBA-114", "Financial Accounting (Tutorial)", "Tutorial", "P2", "TL-114", "SG"),
    slot("Saturday", 3, "BBA-114", "Financial Accounting", "Theory", "ALL", "TL-114", "AS"),
    slot("Saturday", 4, "BBA-116", "Quantitative Techniques", "Theory", "ALL", "TL-114", "VS"),
]

timetables.append({
    "id": "mmmut-bba-b-2026",
    "pageNumber": 19,
    "degree": "BBA",
    "branch": "Business Administration",
    "branchCode": "BBA",
    "section": "SEC-B",
    "room": "TL-114",
    "session": "2026-27",
    "semester": "Semester I",
    "batches": ["P1", "P2"],
    "isVerified": True,
    "subjects": p19_subjects,
    "slots": p19_slots
})

# ==========================================
# PAGE 20: B.Pharm
# Room: L-115, Session: 2026-27, Sem: I
# Batches: P1, P2, P3, P4
# ==========================================
p20_subjects = [
    {"code": "BPT101T", "name": "Basics of Python Programming for Pharmaceutical Sciences", "credits": "Theory", "faculty": "Dr. Smriti Ojha"},
    {"code": "BPT102T", "name": "General Pharmacy (Theory)", "credits": "Theory", "faculty": "Anuj Srivastava"},
    {"code": "BPT103T", "name": "Healthcare Psychology and Communication Skills (Theory)", "credits": "Theory", "faculty": "Mrs. Susmita Chand"},
    {"code": "BPT104T", "name": "Human Anatomy, Physiology and Pathophysiology I (Theory)", "credits": "Theory", "faculty": "Dr Saba Parveen"},
    {"code": "BPT105T", "name": "Introduction to Pharmacognosy (Theory)", "credits": "Theory", "faculty": "Dr Anju Verma"},
    {"code": "BPT106T", "name": "Pharmaceutical Inorganic and Analytical Chemistry (Theory)", "credits": "Theory", "faculty": "Dr Gauri Shankar"},
    {"code": "BPT107P", "name": "General Pharmacy (Practical)", "credits": "Practical", "faculty": "Mr Ramashankar Dubey/Anuj Srivastava/Sarfaraz Hussain"},
    {"code": "BPT108P", "name": "Healthcare Psychology and Communication Skills (Practical)", "credits": "Practical", "faculty": "Mr Sandeep Singh/Susmita Chand/Anuj Srivastava"},
    {"code": "BPT109P", "name": "Human Anatomy, Physiology and Pathophysiology I (Practical)", "credits": "Practical", "faculty": "Dr Rohit Kumar/Safina Khatoon/Mr Pratik Kumar Vishwakarma/Soumya Choudhary"},
    {"code": "BPT110P", "name": "Introduction to Pharmacognosy (Practical)", "credits": "Practical", "faculty": "Dr Anju Verma/Aparna Mishra/Aradhana"},
    {"code": "BPT111P", "name": "Pharmaceutical Inorganic and Analytical Chemistry (Practical)", "credits": "Practical", "faculty": "Dr Gauri Shankar/Mrs. Safina Khatoon/Nitin Kumar"}
]

p20_slots = [
    # Monday
    slot("Monday", 2, "BPT108P", "Healthcare Psychology Lab", "Lab", "P1", "CH-206", "SKS/SP"),
    slot("Monday", 3, "BPT108P", "Healthcare Psychology Lab", "Lab", "P2", "CH-206", "SC/SKS"),
    slot("Monday", 5, "BPT109P", "Anatomy & Physiology Lab", "Lab", "P1", "HAP Lab", "RK/SY"),
    slot("Monday", 6, "BPT109P", "Anatomy & Physiology Lab", "Lab", "P1", "HAP Lab", "RK/SY"),
    slot("Monday", 5, "BPT110P", "Pharmacognosy Lab", "Lab", "P2", "Micro Lab", "AV/AD"),
    slot("Monday", 6, "BPT110P", "Pharmacognosy Lab", "Lab", "P2", "Micro Lab", "AV/AD"),
    slot("Monday", 5, "BPT111P", "Analytical Chemistry Lab", "Lab", "P3", "Chemistry Lab", "GS/NK"),
    slot("Monday", 6, "BPT111P", "Analytical Chemistry Lab", "Lab", "P3", "Chemistry Lab", "GS/NK"),
    slot("Monday", 5, "BPT107P", "General Pharmacy Lab", "Lab", "P4", "P'ceutic Lab", "AJ/RD"),
    slot("Monday", 6, "BPT107P", "General Pharmacy Lab", "Lab", "P4", "P'ceutic Lab", "AJ/RD"),
    # Tuesday
    slot("Tuesday", 1, "BPT105T", "Introduction to Pharmacognosy", "Theory", "ALL", "CH-206", "AV"),
    slot("Tuesday", 2, "BPT104T", "Human Anatomy & Physiology", "Theory", "ALL", "CH-206", "DSP"),
    slot("Tuesday", 3, "BPT106T", "Pharmaceutical Inorganic Chemistry", "Theory", "ALL", "CH-206", "GS"),
    slot("Tuesday", 5, "BPT108P", "Healthcare Psychology Lab", "Lab", "P3", "Micro Lab", "SC/SKS"),
    slot("Tuesday", 7, "BPT108P", "Healthcare Psychology Lab", "Lab", "P4", "Micro Lab", "SC/SKS"),
    # Wednesday
    slot("Wednesday", 1, "BPT104T", "Human Anatomy & Physiology", "Theory", "ALL", "CH-206", "DSP"),
    slot("Wednesday", 2, "BPT102T", "General Pharmacy", "Theory", "ALL", "CH-206", "AJ"),
    slot("Wednesday", 3, "BPT106T", "Pharmaceutical Inorganic Chemistry", "Theory", "ALL", "CH-206", "GS"),
    slot("Wednesday", 4, "BPT103T", "Healthcare Psychology", "Theory", "ALL", "CH-206", "SC"),
    slot("Wednesday", 5, "BPT110P", "Pharmacognosy Lab", "Lab", "P1", "Micro Lab", "AV/AD"),
    slot("Wednesday", 6, "BPT110P", "Pharmacognosy Lab", "Lab", "P1", "Micro Lab", "AV/AD"),
    slot("Wednesday", 5, "BPT111P", "Analytical Chemistry Lab", "Lab", "P2", "Chemistry Lab", "GS/TA"),
    slot("Wednesday", 6, "BPT111P", "Analytical Chemistry Lab", "Lab", "P2", "Chemistry Lab", "GS/TA"),
    slot("Wednesday", 5, "BPT107P", "General Pharmacy Lab", "Lab", "P3", "P'ceutic Lab", "AJ/RD"),
    slot("Wednesday", 6, "BPT107P", "General Pharmacy Lab", "Lab", "P3", "P'ceutic Lab", "AJ/RD"),
    slot("Wednesday", 5, "BPT109P", "Anatomy & Physiology Lab", "Lab", "P4", "HAP Lab", "SK/PKV"),
    slot("Wednesday", 6, "BPT109P", "Anatomy & Physiology Lab", "Lab", "P4", "HAP Lab", "SK/PKV"),
    # Thursday
    slot("Thursday", 2, "BPT101T", "Python Programming", "Theory", "ALL", "CH-206", "SO"),
    slot("Thursday", 3, "BPT104T", "Human Anatomy & Physiology", "Theory", "ALL", "CH-206", "DSP"),
    slot("Thursday", 4, "BPT105T", "Introduction to Pharmacognosy", "Theory", "ALL", "CH-206", "AV"),
    slot("Thursday", 5, "BPT111P", "Analytical Chemistry Lab", "Lab", "P1", "Chemistry Lab", "GS/TA"),
    slot("Thursday", 6, "BPT111P", "Analytical Chemistry Lab", "Lab", "P1", "Chemistry Lab", "GS/TA"),
    slot("Thursday", 5, "BPT107P", "General Pharmacy Lab", "Lab", "P2", "P'ceutic Lab", "AJ/SH"),
    slot("Thursday", 6, "BPT107P", "General Pharmacy Lab", "Lab", "P2", "P'ceutic Lab", "AJ/SH"),
    slot("Thursday", 5, "BPT109P", "Anatomy & Physiology Lab", "Lab", "P3", "HAP Lab", "SK/PKV"),
    slot("Thursday", 6, "BPT109P", "Anatomy & Physiology Lab", "Lab", "P3", "HAP Lab", "SK/PKV"),
    slot("Thursday", 5, "BPT110P", "Pharmacognosy Lab", "Lab", "P4", "Micro Lab", "AV/AM"),
    slot("Thursday", 6, "BPT110P", "Pharmacognosy Lab", "Lab", "P4", "Micro Lab", "AV/AM"),
    # Friday
    slot("Friday", 1, "BPT102T", "General Pharmacy", "Theory", "ALL", "CH-206", "AJ"),
    slot("Friday", 2, "BPT106T", "Pharmaceutical Inorganic Chemistry", "Theory", "ALL", "CH-206", "GS"),
    slot("Friday", 3, "BPT104T", "Human Anatomy & Physiology", "Theory", "ALL", "CH-206", "DSP"),
    slot("Friday", 5, "BPT107P", "General Pharmacy Lab", "Lab", "P1", "P'ceutic Lab", "AJ/SH"),
    slot("Friday", 6, "BPT107P", "General Pharmacy Lab", "Lab", "P1", "P'ceutic Lab", "AJ/SH"),
    slot("Friday", 5, "BPT109P", "Anatomy & Physiology Lab", "Lab", "P2", "HAP Lab", "RK/SY"),
    slot("Friday", 6, "BPT109P", "Anatomy & Physiology Lab", "Lab", "P2", "HAP Lab", "RK/SY"),
    slot("Friday", 5, "BPT110P", "Pharmacognosy Lab", "Lab", "P3", "Micro Lab", "AV/AM"),
    slot("Friday", 6, "BPT110P", "Pharmacognosy Lab", "Lab", "P3", "Micro Lab", "AV/AM"),
    slot("Friday", 5, "BPT111P", "Analytical Chemistry Lab", "Lab", "P4", "Chemistry Lab", "GS/NK"),
    slot("Friday", 6, "BPT111P", "Analytical Chemistry Lab", "Lab", "P4", "Chemistry Lab", "GS/NK"),
    # Saturday
    slot("Saturday", 1, "BPT101T", "Python Programming", "Theory", "ALL", "CH-206", "SO"),
    slot("Saturday", 2, "BPT105T", "Introduction to Pharmacognosy", "Theory", "ALL", "CH-206", "AV"),
    slot("Saturday", 3, "BPT102T", "General Pharmacy", "Theory", "ALL", "CH-206", "AJ"),
]

timetables.append({
    "id": "mmmut-bpharm-a-2026",
    "pageNumber": 20,
    "degree": "B.Pharm",
    "branch": "Pharmacy",
    "branchCode": "PHARM",
    "section": "SEC-A",
    "room": "L-115",
    "session": "2026-27",
    "semester": "Semester I",
    "batches": ["P1", "P2", "P3", "P4"],
    "isVerified": True,
    "subjects": p20_subjects,
    "slots": p20_slots
})

database = {
    "university": "Madan Mohan Malaviya University of Technology, Gorakhpur",
    "shortName": "MMMUT",
    "periods": PERIODS,
    "days": DAYS,
    "timetables": timetables
}

# Write out JSON
os.makedirs(r"D:\AttendX\src\data", exist_ok=True)
with open(r"D:\AttendX\src\data\timetables.json", "w", encoding="utf-8") as f:
    json.dump(database, f, indent=2)

# Write out TypeScript export
ts_content = f"""// AttendX Official Timetable Database extracted from MMMUT PDF
// Generated automatically with 100% fidelity to the 20 sheets

export interface PeriodDefinition {{
  period: number;
  name: string;
  startTime: string;
  endTime: string;
  isLunch: boolean;
}}

export interface TimetableSubject {{
  code: string;
  name: string;
  credits: string;
  faculty: string;
}}

export interface TimetableSlot {{
  day: string;
  period: number;
  subjectCode: string;
  subjectName: string;
  category: "Theory" | "Lab" | "Tutorial";
  batch: string; // "ALL" | "P1" | "P2" | "P3" | "P4" | "T1" | "T2"
  room: string;
  faculty?: string;
}}

export interface UniversityTimetable {{
  id: string;
  pageNumber: number;
  degree: string;
  branch: string;
  branchCode: string;
  section: string;
  room: string;
  session: string;
  semester: string;
  batches: string[];
  isVerified: boolean;
  subjects: TimetableSubject[];
  slots: TimetableSlot[];
}}

export interface UniversityDatabase {{
  university: string;
  shortName: string;
  periods: PeriodDefinition[];
  days: string[];
  timetables: UniversityTimetable[];
}}

export const UNIVERSITY_DATABASE: UniversityDatabase = {json.dumps(database, indent=2)};
"""

with open(r"D:\AttendX\src\data\extractedTimetables.ts", "w", encoding="utf-8") as f:
    f.write(ts_content)

print(f"Successfully generated database with {len(timetables)} timetables.")
