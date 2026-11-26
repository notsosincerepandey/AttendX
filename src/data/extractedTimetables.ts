// AttendX Official Timetable Database extracted from MMMUT PDF
// Generated automatically with 100% fidelity to the 20 sheets

export interface PeriodDefinition {
  period: number;
  name: string;
  startTime: string;
  endTime: string;
  isLunch: boolean;
}

export interface TimetableSubject {
  code: string;
  name: string;
  credits: string;
  faculty: string;
}

export interface TimetableSlot {
  day: string;
  period: number;
  subjectCode: string;
  subjectName: string;
  category: "Theory" | "Lab" | "Tutorial";
  batch: string; // "ALL" | "P1" | "P2" | "P3" | "P4" | "T1" | "T2"
  room: string;
  faculty?: string;
}

export interface UniversityTimetable {
  id: string;
  pageNumber: number;
  degree: string;
  branch: string;
  branchCode: string;
  section: string;
  room: string;
  session: string;
  academicYear?: string;
  status?: "active" | "archived" | "draft";
  semester: string;
  batches: string[];
  isVerified: boolean;
  subjects: TimetableSubject[];
  slots: TimetableSlot[];
}

export interface UniversityDatabase {
  university: string;
  shortName: string;
  periods: PeriodDefinition[];
  days: string[];
  timetables: UniversityTimetable[];
}

export const UNIVERSITY_DATABASE: UniversityDatabase = {
  "university": "Madan Mohan Malaviya University of Technology, Gorakhpur",
  "shortName": "MMMUT",
  "periods": [
    {
      "period": 1,
      "name": "Period I",
      "startTime": "09:10",
      "endTime": "10:00",
      "isLunch": false
    },
    {
      "period": 2,
      "name": "Period II",
      "startTime": "10:00",
      "endTime": "10:50",
      "isLunch": false
    },
    {
      "period": 3,
      "name": "Period III",
      "startTime": "10:50",
      "endTime": "11:40",
      "isLunch": false
    },
    {
      "period": 4,
      "name": "Period IV",
      "startTime": "11:40",
      "endTime": "12:30",
      "isLunch": false
    },
    {
      "period": 0,
      "name": "Lunch Break",
      "startTime": "12:30",
      "endTime": "14:00",
      "isLunch": true
    },
    {
      "period": 5,
      "name": "Period V",
      "startTime": "14:00",
      "endTime": "14:45",
      "isLunch": false
    },
    {
      "period": 6,
      "name": "Period VI",
      "startTime": "14:45",
      "endTime": "15:30",
      "isLunch": false
    },
    {
      "period": 7,
      "name": "Period VII",
      "startTime": "15:30",
      "endTime": "16:15",
      "isLunch": false
    },
    {
      "period": 8,
      "name": "Period VIII",
      "startTime": "16:15",
      "endTime": "17:00",
      "isLunch": false
    }
  ],
  "days": [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ],
  "timetables": [
    {
      "id": "mmmut-btech-ce-a-2025",
      "pageNumber": 1,
      "degree": "B.Tech",
      "branch": "Civil Engineering",
      "branchCode": "CE",
      "section": "SEC-A",
      "room": "TL-206",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics I",
          "credits": "3-1-0",
          "faculty": "Dr. Mohammad Hasan (MH) & Miss. Uzma Faiz (UF)"
        },
        {
          "code": "BSM-131",
          "name": "Engineering Physics",
          "credits": "3-0-2",
          "faculty": "Physics Dept Faculty"
        },
        {
          "code": "BIT-103",
          "name": "Programming in C",
          "credits": "3-0-2",
          "faculty": "Ms. Niharika Singh (NiH) + Mr. Anand Kumar (AK)"
        },
        {
          "code": "BCE-121",
          "name": "Engineering Graphics",
          "credits": "2-0-4",
          "faculty": "Dr. Ravi Prakash Tripathi/Dr. Neeraj Chaubey/Ms. Mahima Modi/Ms. Anuradha"
        },
        {
          "code": "BHS-101",
          "name": "Universal Human Values: Understanding Harmony",
          "credits": "3-1-0",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 1,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "MH"
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "NiH"
        },
        {
          "day": "Monday",
          "period": 7,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 8,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-206",
          "faculty": "UF"
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "MH"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-206",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 7,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-206",
          "faculty": "UF"
        },
        {
          "day": "Wednesday",
          "period": 1,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "MH"
        },
        {
          "day": "Wednesday",
          "period": 3,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-206",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 5,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "L-104",
          "faculty": "RPT/SU/Ans/CC"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "L-104",
          "faculty": "RPT/SU/Ans/CC"
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "L-104",
          "faculty": "RPT/SU/Ans/CC"
        },
        {
          "day": "Wednesday",
          "period": 8,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "L-104",
          "faculty": "RPT/SU/Ans/CC"
        },
        {
          "day": "Wednesday",
          "period": 5,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-02",
          "faculty": "AK"
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-02",
          "faculty": "AK"
        },
        {
          "day": "Thursday",
          "period": 3,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "NiH"
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "L-104",
          "faculty": "MM/AD/AkS/An"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "L-104",
          "faculty": "MM/AD/AkS/An"
        },
        {
          "day": "Thursday",
          "period": 7,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "L-104",
          "faculty": "MM/AD/AkS/An"
        },
        {
          "day": "Thursday",
          "period": 8,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "L-104",
          "faculty": "MM/AD/AkS/An"
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 3,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "NiH"
        },
        {
          "day": "Friday",
          "period": 4,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "NC"
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-02",
          "faculty": "AK"
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-02",
          "faculty": "AK"
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "NC"
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": ""
        }
      ]
    },
    {
      "id": "mmmut-btech-ce-b-2025",
      "pageNumber": 2,
      "degree": "B.Tech",
      "branch": "Civil Engineering",
      "branchCode": "CE",
      "section": "SEC-B",
      "room": "TL-206",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics I",
          "credits": "3-1-0",
          "faculty": "Dr. Mohammad Hasan (MH) & Akash Kumar Singh (AKS)"
        },
        {
          "code": "BSM-131",
          "name": "Engineering Physics",
          "credits": "3-0-2",
          "faculty": "Physics Dept Faculty"
        },
        {
          "code": "BIT-103",
          "name": "Programming in C",
          "credits": "3-0-2",
          "faculty": "Ms. Niharika Singh (NiH)"
        },
        {
          "code": "BCE-121",
          "name": "Engineering Graphics",
          "credits": "2-0-4",
          "faculty": "Dr. Deepak Prasad/Mr. Ramendra Pandey/Dr. Neeraj Chaubey/Mr. Abhishek Kr. Singh/Mr. Ayush Kr. Srivastav/Ms. Priyanka Pandey/Ms. Anandita"
        },
        {
          "code": "BHS-101",
          "name": "Universal Human Values: Understanding Harmony",
          "credits": "3-1-0",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 1,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "L-104",
          "faculty": "AkS/PP/AkS"
        },
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "L-104",
          "faculty": "AkS/PP/AkS"
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "L-104",
          "faculty": "AkS/PP/AkS"
        },
        {
          "day": "Monday",
          "period": 4,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "L-104",
          "faculty": "AkS/PP/AkS"
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 4,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "NiH"
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "NC"
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "L-104",
          "faculty": "DP/NC/An"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "L-104",
          "faculty": "DP/NC/An"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "L-104",
          "faculty": "DP/NC/An"
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "L-104",
          "faculty": "DP/NC/An"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 5,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "NiH"
        },
        {
          "day": "Tuesday",
          "period": 6,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-01",
          "faculty": "NiH"
        },
        {
          "day": "Wednesday",
          "period": 3,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-01",
          "faculty": "NiH"
        },
        {
          "day": "Wednesday",
          "period": 4,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "NiH"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "MH"
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "MH"
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-206",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 7,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-206",
          "faculty": "AKS"
        },
        {
          "day": "Friday",
          "period": 1,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "MH"
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BCE-121",
          "subjectName": "Engineering Graphics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": "NC"
        },
        {
          "day": "Friday",
          "period": 7,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-206",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-206",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-206",
          "faculty": "AKS"
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-01",
          "faculty": "NiH"
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-01",
          "faculty": "NiH"
        }
      ]
    },
    {
      "id": "mmmut-btech-cse-a-2025",
      "pageNumber": 3,
      "degree": "B.Tech",
      "branch": "Computer Science & Engineering",
      "branchCode": "CSE",
      "section": "SEC-A",
      "room": "TL-109",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics-I",
          "credits": "3-1-0",
          "faculty": "Dr. Kumari Kanta (KK) & Deepali Maurya (DM)"
        },
        {
          "code": "BSM-131",
          "name": "Engineering Physics",
          "credits": "3-0-2",
          "faculty": "Physics Dept Faculty"
        },
        {
          "code": "BCS-110",
          "name": "Introduction to C Programming",
          "credits": "3-0-2",
          "faculty": "SKS, Vaibhavi (RS), Harsh (RS)"
        },
        {
          "code": "BCS-111",
          "name": "Web Designing-1",
          "credits": "2-0-4",
          "faculty": "Dr. Meenu, Anushka (RS), Shreyansh (RS)"
        },
        {
          "code": "BHS-101",
          "name": "Universal Human Values: Understanding Harmony",
          "credits": "3-1-0",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 1,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 4,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-03",
          "faculty": "Dr. Meenu, Anushka (RS)"
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-03",
          "faculty": "Dr. Meenu, Anushka (RS)"
        },
        {
          "day": "Monday",
          "period": 7,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-03",
          "faculty": "Dr. Meenu, Anushka (RS)"
        },
        {
          "day": "Monday",
          "period": 8,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-03",
          "faculty": "Dr. Meenu, Anushka (RS)"
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-04",
          "faculty": "SKS, Vaibhavi (RS)"
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-04",
          "faculty": "SKS, Vaibhavi (RS)"
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "Dr. Meenu"
        },
        {
          "day": "Tuesday",
          "period": 5,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "Dr. Meenu, Shreyansh (RS)"
        },
        {
          "day": "Tuesday",
          "period": 6,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "Dr. Meenu, Shreyansh (RS)"
        },
        {
          "day": "Tuesday",
          "period": 7,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "Dr. Meenu, Shreyansh (RS)"
        },
        {
          "day": "Tuesday",
          "period": 8,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "Dr. Meenu, Shreyansh (RS)"
        },
        {
          "day": "Wednesday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 4,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "Dr. Meenu"
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "KK"
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "SKS"
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-109",
          "faculty": "DM"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 7,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-109",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "KK"
        },
        {
          "day": "Friday",
          "period": 2,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "SKS"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-109",
          "faculty": "DM"
        },
        {
          "day": "Friday",
          "period": 7,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-109",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "KK"
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "SKS"
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-04",
          "faculty": "SKS, Harsh (RS)"
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-04",
          "faculty": "SKS, Harsh (RS)"
        }
      ]
    },
    {
      "id": "mmmut-btech-cse-b-2025",
      "pageNumber": 4,
      "degree": "B.Tech",
      "branch": "Computer Science & Engineering",
      "branchCode": "CSE",
      "section": "SEC-B",
      "room": "TL-109",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics-I",
          "credits": "3-1-0",
          "faculty": "Dr. Kumari Kanta (KK) & Shristi Srivastva (SS)"
        },
        {
          "code": "BSM-131",
          "name": "Engineering Physics",
          "credits": "3-0-2",
          "faculty": "Physics Dept Faculty"
        },
        {
          "code": "BCS-110",
          "name": "Introduction to C Programming",
          "credits": "3-0-2",
          "faculty": "SKS, MKS"
        },
        {
          "code": "BCS-111",
          "name": "Web Designing-1",
          "credits": "2-0-4",
          "faculty": "Dr. Meenu, VDB (RS)"
        },
        {
          "code": "BHS-101",
          "name": "Universal Human Values: Understanding Harmony",
          "credits": "3-1-0",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "KK"
        },
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "SKS"
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-04",
          "faculty": "SKS, MKS"
        },
        {
          "day": "Monday",
          "period": 4,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-04",
          "faculty": "SKS, MKS"
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-109",
          "faculty": "SS"
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "KK"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "SKS"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-04",
          "faculty": "SKS, MKS"
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-04",
          "faculty": "SKS, MKS"
        },
        {
          "day": "Tuesday",
          "period": 5,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 6,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-109",
          "faculty": "SS"
        },
        {
          "day": "Tuesday",
          "period": 7,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-109",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "KK"
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "SKS"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 4,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "Dr. Meenu"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "G6",
          "faculty": "VDB (RS)"
        },
        {
          "day": "Thursday",
          "period": 7,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "G6",
          "faculty": "VDB (RS)"
        },
        {
          "day": "Thursday",
          "period": 8,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "G6",
          "faculty": "VDB (RS)"
        },
        {
          "day": "Friday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 4,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": "Dr. Meenu"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "VDB (RS)"
        },
        {
          "day": "Friday",
          "period": 7,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "VDB (RS)"
        },
        {
          "day": "Friday",
          "period": 8,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "VDB (RS)"
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-109",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-109",
          "faculty": ""
        }
      ]
    },
    {
      "id": "mmmut-btech-cse-c-2025",
      "pageNumber": 5,
      "degree": "B.Tech",
      "branch": "Computer Science & Engineering",
      "branchCode": "CSE",
      "section": "SEC-C",
      "room": "TL-201",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics-I",
          "credits": "3-1-0",
          "faculty": "Dr. Kumari Kanta (KK) & Nafesa Khatoon (NK)"
        },
        {
          "code": "BSM-131",
          "name": "Engineering Physics",
          "credits": "3-0-2",
          "faculty": "Physics Dept Faculty"
        },
        {
          "code": "BCS-110",
          "name": "Introduction to C Programming",
          "credits": "3-0-2",
          "faculty": "RAM, VAIBHAVI (RS), Harsh (RS)"
        },
        {
          "code": "BCS-111",
          "name": "Web Designing-1",
          "credits": "2-0-4",
          "faculty": "GF-6, PS (RS), Divyanshi (RS)"
        },
        {
          "code": "BHS-101",
          "name": "Universal Human Values: Understanding Harmony",
          "credits": "3-1-0",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "KK"
        },
        {
          "day": "Monday",
          "period": 4,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-201",
          "faculty": "NK"
        },
        {
          "day": "Monday",
          "period": 7,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-02",
          "faculty": "PS (RS)"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-02",
          "faculty": "PS (RS)"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-03",
          "faculty": "RAM, Vaibhavi (RS)"
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-03",
          "faculty": "RAM, Vaibhavi (RS)"
        },
        {
          "day": "Tuesday",
          "period": 5,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 6,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-201",
          "faculty": "NK"
        },
        {
          "day": "Tuesday",
          "period": 7,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 3,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "KK"
        },
        {
          "day": "Wednesday",
          "period": 4,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 5,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-02",
          "faculty": "Divyanshi (RS)"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-02",
          "faculty": "Divyanshi (RS)"
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-02",
          "faculty": "Divyanshi (RS)"
        },
        {
          "day": "Wednesday",
          "period": 8,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-02",
          "faculty": "Divyanshi (RS)"
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "GF-6"
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "RAM"
        },
        {
          "day": "Thursday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 4,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 1,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "GF-6"
        },
        {
          "day": "Friday",
          "period": 2,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "RAM"
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "KK"
        },
        {
          "day": "Friday",
          "period": 7,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-01",
          "faculty": "RAM, Harsh (RS)"
        },
        {
          "day": "Friday",
          "period": 8,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-01",
          "faculty": "RAM, Harsh (RS)"
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "RAM"
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        }
      ]
    },
    {
      "id": "mmmut-btech-cse-d-2025",
      "pageNumber": 6,
      "degree": "B.Tech",
      "branch": "Computer Science & Engineering",
      "branchCode": "CSE",
      "section": "SEC-D",
      "room": "TL-201",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics-I",
          "credits": "3-1-0",
          "faculty": "Dr. Harsha Pandey (HP) & Saloni Singh (SS)"
        },
        {
          "code": "BSM-131",
          "name": "Engineering Physics",
          "credits": "3-0-2",
          "faculty": "Physics Dept Faculty"
        },
        {
          "code": "BCS-110",
          "name": "Introduction to C Programming",
          "credits": "3-0-2",
          "faculty": "RAM, SKS, MKS"
        },
        {
          "code": "BCS-111",
          "name": "Web Designing-1",
          "credits": "2-0-4",
          "faculty": "Dr. Meenu, AM (RS), SG (RS)"
        },
        {
          "code": "BHS-101",
          "name": "Universal Human Values: Understanding Harmony",
          "credits": "3-1-0",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 1,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "RAM"
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-01",
          "faculty": "AM (RS)"
        },
        {
          "day": "Monday",
          "period": 7,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-01",
          "faculty": "AM (RS)"
        },
        {
          "day": "Monday",
          "period": 8,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-01",
          "faculty": "AM (RS)"
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "RAM"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "Dr. Meenu"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "HP"
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 5,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 6,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 6,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "SG (RS)"
        },
        {
          "day": "Tuesday",
          "period": 7,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "SG (RS)"
        },
        {
          "day": "Tuesday",
          "period": 8,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "SG (RS)"
        },
        {
          "day": "Wednesday",
          "period": 1,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "RAM"
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "Dr. Meenu"
        },
        {
          "day": "Wednesday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 4,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-04",
          "faculty": "RAM, MKS"
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-04",
          "faculty": "RAM, MKS"
        },
        {
          "day": "Thursday",
          "period": 3,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "HP"
        },
        {
          "day": "Thursday",
          "period": 4,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-201",
          "faculty": "SS"
        },
        {
          "day": "Thursday",
          "period": 7,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 8,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 3,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": "HP"
        },
        {
          "day": "Friday",
          "period": 4,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 7,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-201",
          "faculty": "SS"
        },
        {
          "day": "Friday",
          "period": 8,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-201",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "RAM, SKS"
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "RAM, SKS"
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-201",
          "faculty": ""
        }
      ]
    },
        {
      "id": "mmmut-btech-cse-e-2025",
      "pageNumber": 6,
      "degree": "B.Tech",
      "branch": "Computer Science & Engineering",
      "branchCode": "CSE",
      "section": "SEC-E",
      "room": "TL-202",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics-I",
          "credits": "3-1-0",
          "faculty": "Dr. Harsha Pandey (HP)"
        },
        {
          "code": "BSM-131",
          "name": "Engineering Physics",
          "credits": "3-0-2",
          "faculty": "Physics Dept Faculty"
        },
        {
          "code": "BCS-110",
          "name": "Introduction to C Programming",
          "credits": "3-0-2",
          "faculty": "RAM, SKS"
        },
        {
          "code": "BCS-111",
          "name": "Web Designing-1",
          "credits": "2-0-4",
          "faculty": "Dr. Meenu"
        },
        {
          "code": "BHM-101",
          "name": "Professional Communication",
          "credits": "2-0-0",
          "faculty": "Humanities Dept"
        },
        {
          "code": "BHS-101",
          "name": "Universal Human Values",
          "credits": "2-0-0",
          "faculty": "Guest Faculty"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "HP"
        },
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "Physics Dept Faculty"
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "RAM, SKS"
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-02",
          "faculty": "Dr. Meenu"
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "Physics Dept Faculty"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "RAM, SKS"
        },
        {
          "day": "Tuesday",
          "period": 5,
          "subjectCode": "BCS-111",
          "subjectName": "Web Designing-1 Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-02",
          "faculty": "Dr. Meenu"
        },
        {
          "day": "Wednesday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "HP"
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BHM-101",
          "subjectName": "Professional Communication",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "Humanities Dept"
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "HP"
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "RAM, SKS"
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-02",
          "faculty": "RAM, SKS"
        },
        {
          "day": "Friday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-I Tutorial",
          "category": "Tutorial",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "HP"
        },
        {
          "day": "Friday",
          "period": 2,
          "subjectCode": "BHM-101",
          "subjectName": "Professional Communication",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "Humanities Dept"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BCS-110",
          "subjectName": "Introduction to C Programming Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-02",
          "faculty": "RAM, SKS"
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "Guest Faculty"
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "Physics Dept Faculty"
        }
      ]
    },
    {
      "id": "mmmut-btech-it-a-2025",
      "pageNumber": 7,
      "degree": "B.Tech",
      "branch": "Information Technology",
      "branchCode": "IT",
      "section": "SEC-A",
      "room": "TL-203",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics I",
          "credits": "3-1-0",
          "faculty": "Dr. Vinod Baniya & Khushboo Maurya (KM)"
        },
        {
          "code": "BSM-131",
          "name": "Engineering Physics",
          "credits": "3-0-2",
          "faculty": "Physics Dept Faculty"
        },
        {
          "code": "BIT-103",
          "name": "Programming in C",
          "credits": "3-0-2",
          "faculty": "Prof. S P Singh (SPS) + Mr. Dharmesh Sonkar (DS)"
        },
        {
          "code": "BIT-104",
          "name": "Internet and Web Designing",
          "credits": "2-0-4",
          "faculty": "Ms. Nida Shakeel (NS)"
        },
        {
          "code": "BHS-101",
          "name": "Universal Human Values",
          "credits": "3-1-0",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 1,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-03",
          "faculty": "NS"
        },
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-03",
          "faculty": "NS"
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-03",
          "faculty": "NS"
        },
        {
          "day": "Monday",
          "period": 4,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-03",
          "faculty": "NS"
        },
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "CL-02",
          "faculty": "DS"
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "NS"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "NS"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "NS"
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-03",
          "faculty": "NS"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "CL-02",
          "faculty": "DS"
        },
        {
          "day": "Tuesday",
          "period": 5,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "VB"
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "SPS"
        },
        {
          "day": "Wednesday",
          "period": 5,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "NS"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-203",
          "faculty": "KM"
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 8,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "VB"
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "SPS"
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-203",
          "faculty": "KM"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 7,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-203",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 4,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "SPS"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-203",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "VB"
        },
        {
          "day": "Friday",
          "period": 7,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 8,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "NS"
        }
      ]
    },
    {
      "id": "mmmut-btech-it-b-2025",
      "pageNumber": 8,
      "degree": "B.Tech",
      "branch": "Information Technology",
      "branchCode": "IT",
      "section": "SEC-B",
      "room": "TL-203",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics I",
          "credits": "3-1-0",
          "faculty": "Dr. Vinod Baniya (VB) & Miss Disha Gupta (DG)"
        },
        {
          "code": "BSM-131",
          "name": "Engineering Physics",
          "credits": "3-0-2",
          "faculty": "Physics Dept Faculty"
        },
        {
          "code": "BIT-103",
          "name": "Programming in C",
          "credits": "3-0-2",
          "faculty": "Prof. S P Singh (SPS) + Mr. Dharmesh Sonkar (DS)"
        },
        {
          "code": "BIT-104",
          "name": "Internet and Web Designing",
          "credits": "2-0-4",
          "faculty": "Mr. Tejbahadur (TH)"
        },
        {
          "code": "BHS-101",
          "name": "Universal Human Values",
          "credits": "3-1-0",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "VB"
        },
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "SPS"
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 4,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "VB"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "SPS"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-110",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 7,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-203",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 8,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-203",
          "faculty": "DG"
        },
        {
          "day": "Wednesday",
          "period": 1,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 3,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 4,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 5,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-03",
          "faculty": "TH"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-03",
          "faculty": "TH"
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-03",
          "faculty": "TH"
        },
        {
          "day": "Wednesday",
          "period": 8,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-03",
          "faculty": "TH"
        },
        {
          "day": "Wednesday",
          "period": 5,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "CL-02",
          "faculty": "SPS/DS"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "CL-02",
          "faculty": "SPS/DS"
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 3,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "VB"
        },
        {
          "day": "Thursday",
          "period": 4,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-203",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-02",
          "faculty": "TH"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-02",
          "faculty": "TH"
        },
        {
          "day": "Thursday",
          "period": 7,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-02",
          "faculty": "TH"
        },
        {
          "day": "Thursday",
          "period": 8,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-02",
          "faculty": "TH"
        },
        {
          "day": "Friday",
          "period": 1,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "SPS"
        },
        {
          "day": "Friday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-203",
          "faculty": "DG"
        },
        {
          "day": "Friday",
          "period": 7,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "TH"
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BIT-104",
          "subjectName": "Internet and Web Designing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": "TH"
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-203",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "CL-02",
          "faculty": "SPS/DS"
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "CL-02",
          "faculty": "SPS/DS"
        }
      ]
    },
    {
      "id": "mmmut-btech-che-a-2025",
      "pageNumber": 9,
      "degree": "B.Tech",
      "branch": "Chemical Engineering",
      "branchCode": "CHE",
      "section": "SEC-A",
      "room": "TL-110",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics -I",
          "credits": "3-1-0",
          "faculty": "Dr. Vinod Baniya (VB) & Abhinav Gaur (AG)"
        },
        {
          "code": "BSM-131",
          "name": "Engineering Physics",
          "credits": "3-0-2",
          "faculty": "Physics Dept Faculty"
        },
        {
          "code": "BIT-103",
          "name": "Programming in C",
          "credits": "3-0-2",
          "faculty": "Mr. Amritesh Kumar Gupta (AKG)"
        },
        {
          "code": "BME-101",
          "name": "Manufacturing Techniques Workshop",
          "credits": "2-0-4",
          "faculty": "Mechanical Engg Dept Faculty"
        },
        {
          "code": "BHS-101",
          "name": "Universal Human Values",
          "credits": "3-1-0",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-110",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics -I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-110",
          "faculty": "VB"
        },
        {
          "day": "Monday",
          "period": 7,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 8,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-110",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics -I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-110",
          "faculty": "VB"
        },
        {
          "day": "Tuesday",
          "period": 5,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 6,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Physics Lab",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 7,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics -I (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-110",
          "faculty": "AG"
        },
        {
          "day": "Wednesday",
          "period": 1,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-02",
          "faculty": "AKG"
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "ITRC-02",
          "faculty": "AKG"
        },
        {
          "day": "Wednesday",
          "period": 3,
          "subjectCode": "BME-101",
          "subjectName": "Manufacturing Workshop Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Workshop",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 4,
          "subjectCode": "BME-101",
          "subjectName": "Manufacturing Workshop Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Workshop",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-110",
          "faculty": "AKG"
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-110",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BSM-131",
          "subjectName": "Engineering Physics",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-110",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 3,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-110",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 4,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-110",
          "faculty": "AKG"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BME-101",
          "subjectName": "Manufacturing Workshop Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Workshop",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 7,
          "subjectCode": "BME-101",
          "subjectName": "Manufacturing Workshop Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Workshop",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics -I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-110",
          "faculty": "VB"
        },
        {
          "day": "Friday",
          "period": 3,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-110",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 4,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-110",
          "faculty": "AKG"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BME-101",
          "subjectName": "Manufacturing Workshop",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-110",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics -I (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-110",
          "faculty": "AG"
        },
        {
          "day": "Friday",
          "period": 7,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-110",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-01",
          "faculty": "AKG"
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BIT-103",
          "subjectName": "Programming in C Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "ITRC-01",
          "faculty": "AKG"
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BME-101",
          "subjectName": "Manufacturing Workshop",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-110",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BHS-101",
          "subjectName": "Universal Human Values",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-110",
          "faculty": ""
        }
      ]
    },
    {
      "id": "mmmut-btech-me-a-2025",
      "pageNumber": 10,
      "degree": "B.Tech",
      "branch": "Mechanical Engineering",
      "branchCode": "ME",
      "section": "SEC-A",
      "room": "TL-205",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics-1",
          "credits": "3-1-0",
          "faculty": "Dr. Sajjan Lal (SL) & Mr. Vijay Pratap (VP)"
        },
        {
          "code": "BSM-140",
          "name": "Environmental Science and Green Chemistry",
          "credits": "3-0-2",
          "faculty": "RKY, NK & RS"
        },
        {
          "code": "BEE-110",
          "name": "Basic Electrical Engineering",
          "credits": "3-0-2",
          "faculty": "Dr Shekhar Yadav (SY)/Monu (M)"
        },
        {
          "code": "BME-104",
          "name": "Manufacturing Practice Workshop",
          "credits": "2-0-4",
          "faculty": "Anjani Kumar Singh / Dr. Kuldeep Kumar / PSY / Nistha"
        },
        {
          "code": "BHS-102",
          "name": "Technical Writing and Professional Communication",
          "credits": "2-1-2",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-1",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "SL"
        },
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "SY"
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "RKY"
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "RKY, NK & RS"
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "RKY, NK & RS"
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Workshop",
          "faculty": "PSY/Nistha"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Workshop",
          "faculty": "PSY/Nistha"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Workshop",
          "faculty": "PSY/Nistha"
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Workshop",
          "faculty": "PSY/Nistha"
        },
        {
          "day": "Tuesday",
          "period": 5,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "CL, Preeti & RS"
        },
        {
          "day": "Tuesday",
          "period": 6,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "CL, Preeti & RS"
        },
        {
          "day": "Tuesday",
          "period": 7,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "RKY"
        },
        {
          "day": "Tuesday",
          "period": 8,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-205",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 1,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "RKY"
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "MG"
        },
        {
          "day": "Wednesday",
          "period": 5,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EE Lab",
          "faculty": "SY/M"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EE Lab",
          "faculty": "SY/M"
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 8,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-1 (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-205",
          "faculty": "VP"
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-1",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "SL"
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "SY"
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "MG"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-1 (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-205",
          "faculty": "VP"
        },
        {
          "day": "Friday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-1",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "SL"
        },
        {
          "day": "Friday",
          "period": 2,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "SY"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Workshop",
          "faculty": "Anjani Kumar Singh / Dr. Kuldeep Kumar"
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Workshop",
          "faculty": "Anjani Kumar Singh / Dr. Kuldeep Kumar"
        },
        {
          "day": "Friday",
          "period": 7,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Workshop",
          "faculty": "Anjani Kumar Singh / Dr. Kuldeep Kumar"
        },
        {
          "day": "Friday",
          "period": 8,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Workshop",
          "faculty": "Anjani Kumar Singh / Dr. Kuldeep Kumar"
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-205",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EE Lab",
          "faculty": "SY/M"
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EE Lab",
          "faculty": "SY/M"
        }
      ]
    },
    {
      "id": "mmmut-btech-me-b-2025",
      "pageNumber": 11,
      "degree": "B.Tech",
      "branch": "Mechanical Engineering",
      "branchCode": "ME",
      "section": "SEC-B",
      "room": "TL-205",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics-1",
          "credits": "3-1-0",
          "faculty": "Dr. Sajjan Lal (SL) & Nidhi Verma (NV)"
        },
        {
          "code": "BSM-140",
          "name": "Environmental Science and Green Chemistry",
          "credits": "3-0-2",
          "faculty": "Preeti & RS"
        },
        {
          "code": "BEE-110",
          "name": "Basic Electrical Engineering",
          "credits": "3-0-2",
          "faculty": "Dr Shekhar Yadav (SY)/Dr Prabhakar Tiwari (PT)/Monu (M)"
        },
        {
          "code": "BME-104",
          "name": "Manufacturing Practice Workshop",
          "credits": "2-0-4",
          "faculty": "Anjani Kumar Singh/Anuj/PSY/Nistha/MG"
        },
        {
          "code": "BHS-102",
          "name": "Technical Writing and Professional Communication",
          "credits": "2-1-2",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 1,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "Preeti & RS"
        },
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "Preeti & RS"
        },
        {
          "day": "Monday",
          "period": 1,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Workshop",
          "faculty": "Anjani Kumar Singh/Anuj"
        },
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Workshop",
          "faculty": "Anjani Kumar Singh/Anuj"
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Workshop",
          "faculty": "Anjani Kumar Singh/Anuj"
        },
        {
          "day": "Monday",
          "period": 4,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Workshop",
          "faculty": "Anjani Kumar Singh/Anuj"
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "SY"
        },
        {
          "day": "Monday",
          "period": 7,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-1 (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-205",
          "faculty": "NV"
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-1",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "SL"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "SY"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "RKY"
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "MG"
        },
        {
          "day": "Tuesday",
          "period": 5,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 3,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "RKY"
        },
        {
          "day": "Wednesday",
          "period": 4,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Workshop",
          "faculty": "PSY/Nistha"
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Workshop",
          "faculty": "PSY/Nistha"
        },
        {
          "day": "Wednesday",
          "period": 8,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Workshop",
          "faculty": "PSY/Nistha"
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EE Lab",
          "faculty": "M/PT"
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EE Lab",
          "faculty": "M/PT"
        },
        {
          "day": "Thursday",
          "period": 3,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "RKY"
        },
        {
          "day": "Thursday",
          "period": 4,
          "subjectCode": "BME-104",
          "subjectName": "Manufacturing Practice Workshop",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "MG"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 7,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-1 (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-205",
          "faculty": "NV"
        },
        {
          "day": "Friday",
          "period": 2,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 3,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-1",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "SL"
        },
        {
          "day": "Friday",
          "period": 4,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "SY"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "Preeti & RS"
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "Preeti & RS"
        },
        {
          "day": "Friday",
          "period": 7,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-205",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EE Lab",
          "faculty": "SY/M"
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EE Lab",
          "faculty": "SY/M"
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics-1",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-205",
          "faculty": "SL"
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-205",
          "faculty": ""
        }
      ]
    },
    {
      "id": "mmmut-btech-ee-a-2025",
      "pageNumber": 12,
      "degree": "B.Tech",
      "branch": "Electrical Engineering",
      "branchCode": "EE",
      "section": "SEC-A",
      "room": "TL-202",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics I",
          "credits": "3-1-0",
          "faculty": "Dr. Amit Kumar Barnwal (AKB) & Rohit Kasera (RK)"
        },
        {
          "code": "BSM-140",
          "name": "Environmental Science and Green Chemistry",
          "credits": "3-0-2",
          "faculty": "PS, Preeti, CL & RS"
        },
        {
          "code": "BEE-110",
          "name": "Basic Electrical Engineering",
          "credits": "3-0-2",
          "faculty": "Dr. Awadhesh Kumar (AK)/Dr Rohit Babu (RB)/Utkarsh Shukla (US)"
        },
        {
          "code": "BEE-108A",
          "name": "Electrical Wiring & Estimation",
          "credits": "3-0-2",
          "faculty": "Mr K B Sahay (KBS)/Dr Bindeshwar Singh (BS)/Dr Ravishankar Gupta (RSG)"
        },
        {
          "code": "BHS-102",
          "name": "Technical Writing and Professional Communication",
          "credits": "2-1-2",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 1,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "PS"
        },
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "AKB"
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BEE-108A",
          "subjectName": "Electrical Wiring Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Wiring Lab",
          "faculty": "KBS/RSG"
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BEE-108A",
          "subjectName": "Electrical Wiring Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Wiring Lab",
          "faculty": "KBS/RSG"
        },
        {
          "day": "Monday",
          "period": 7,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-202",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "AK"
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 7,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 3,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "AK"
        },
        {
          "day": "Wednesday",
          "period": 4,
          "subjectCode": "BEE-108A",
          "subjectName": "Electrical Wiring & Estimation",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "KBS"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-202",
          "faculty": "RK"
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 8,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "PS"
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "AKB"
        },
        {
          "day": "Thursday",
          "period": 3,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EE Lab",
          "faculty": "AK/US"
        },
        {
          "day": "Thursday",
          "period": 4,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EE Lab",
          "faculty": "AK/US"
        },
        {
          "day": "Thursday",
          "period": 3,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "SJ, Preeti & RS"
        },
        {
          "day": "Thursday",
          "period": 4,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "SJ, Preeti & RS"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "AK"
        },
        {
          "day": "Thursday",
          "period": 7,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-202",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 1,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "PS"
        },
        {
          "day": "Friday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "AKB"
        },
        {
          "day": "Friday",
          "period": 3,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EE Lab",
          "faculty": "RB/US"
        },
        {
          "day": "Friday",
          "period": 4,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EE Lab",
          "faculty": "RB/US"
        },
        {
          "day": "Friday",
          "period": 3,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "PS, CL & RS"
        },
        {
          "day": "Friday",
          "period": 4,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "PS, CL & RS"
        },
        {
          "day": "Friday",
          "period": 7,
          "subjectCode": "BEE-108A",
          "subjectName": "Electrical Wiring & Estimation",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "KBS"
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BEE-108A",
          "subjectName": "Electrical Wiring & Estimation",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "KBS"
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-202",
          "faculty": "RK"
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BEE-108A",
          "subjectName": "Electrical Wiring Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Wiring Lab",
          "faculty": "RSG/BS"
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BEE-108A",
          "subjectName": "Electrical Wiring Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Wiring Lab",
          "faculty": "RSG/BS"
        }
      ]
    },
    {
      "id": "mmmut-btech-ee-b-2025",
      "pageNumber": 13,
      "degree": "B.Tech",
      "branch": "Electrical Engineering",
      "branchCode": "EE",
      "section": "SEC-B",
      "room": "TL-202",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics I",
          "credits": "3-1-0",
          "faculty": "Dr. Amit Kumar Barnwal (AKB) & Vivek Kushwaha (VK)"
        },
        {
          "code": "BSM-140",
          "name": "Environmental Science and Green Chemistry",
          "credits": "3-0-2",
          "faculty": "SJ, PS, Preeti, NK & RS"
        },
        {
          "code": "BEE-110",
          "name": "Basic Electrical Engineering",
          "credits": "3-0-2",
          "faculty": "Dr Rohit Babu (RB)/ Dr Awadhesh Kumar (AK)/ Utkarsh Shukla (US)"
        },
        {
          "code": "BEE-108A",
          "name": "Electrical Wiring & Estimation",
          "credits": "3-0-2",
          "faculty": "Mr K B Sahay (KBS)/Dr Amit Verma (AV)"
        },
        {
          "code": "BHS-102",
          "name": "Technical Writing and Professional Communication",
          "credits": "2-1-2",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BEE-108A",
          "subjectName": "Electrical Wiring & Estimation",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "KBS"
        },
        {
          "day": "Monday",
          "period": 4,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "RB"
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-202",
          "faculty": "VK"
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-202",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "SJ"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "AKB"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EE Lab",
          "faculty": "PT/US"
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EE Lab",
          "faculty": "PT/US"
        },
        {
          "day": "Tuesday",
          "period": 6,
          "subjectCode": "BEE-108A",
          "subjectName": "Electrical Wiring & Estimation",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "KBS"
        },
        {
          "day": "Tuesday",
          "period": 8,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 1,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "SJ"
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "AKB"
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EE Lab",
          "faculty": "AK/US"
        },
        {
          "day": "Wednesday",
          "period": 8,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EE Lab",
          "faculty": "AK/US"
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "PS, Preeti & RS"
        },
        {
          "day": "Wednesday",
          "period": 8,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "PS, Preeti & RS"
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BEE-108A",
          "subjectName": "Electrical Wiring Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Wiring Lab",
          "faculty": "KBS/AV"
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BEE-108A",
          "subjectName": "Electrical Wiring Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Wiring Lab",
          "faculty": "KBS/AV"
        },
        {
          "day": "Thursday",
          "period": 3,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "RB"
        },
        {
          "day": "Thursday",
          "period": 4,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 7,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "PS, NK & RS"
        },
        {
          "day": "Thursday",
          "period": 8,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "PS, NK & RS"
        },
        {
          "day": "Thursday",
          "period": 8,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-202",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 3,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "SJ"
        },
        {
          "day": "Friday",
          "period": 4,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "AKB"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BEE-108A",
          "subjectName": "Electrical Wiring & Estimation",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "KBS"
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": "RB"
        },
        {
          "day": "Friday",
          "period": 7,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 8,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BEE-108A",
          "subjectName": "Electrical Wiring Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Wiring Lab",
          "faculty": "KBS/AV"
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BEE-108A",
          "subjectName": "Electrical Wiring Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Wiring Lab",
          "faculty": "KBS/AV"
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-202",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics I (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-202",
          "faculty": "VK"
        }
      ]
    },
    {
      "id": "mmmut-btech-ece-a-2025",
      "pageNumber": 14,
      "degree": "B.Tech",
      "branch": "Electronics & Communication Engineering",
      "branchCode": "ECE",
      "section": "SEC-A",
      "room": "TL-207",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics - I",
          "credits": "3-1-0",
          "faculty": "Dr. Harish Chandra (HC) and Prgya Mishra (PM)"
        },
        {
          "code": "BSM-140",
          "name": "Environmental Science and Green Chemistry",
          "credits": "3-0-2",
          "faculty": "PPP, PS, NK, CL & RS"
        },
        {
          "code": "BEE-110",
          "name": "Basic Electrical Engineering",
          "credits": "3-0-2",
          "faculty": "Dr Rohit Babu (RB)/Dr Divyanshi Srivastava (DDS)/Arushi Gupta (AG)"
        },
        {
          "code": "BEC-106",
          "name": "Electronic Components Testing and Measurement",
          "credits": "2-0-4",
          "faculty": "Dr. Pooja Lohia (PL)/Dr. Chandan (CH)/Mr. Nagendra Kumar (NK)"
        },
        {
          "code": "BHS-102",
          "name": "Technical Writing and Professional Communication",
          "credits": "2-1-2",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "HC"
        },
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "DDS"
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "PPP"
        },
        {
          "day": "Monday",
          "period": 7,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EE Lab",
          "faculty": "RB/AG"
        },
        {
          "day": "Monday",
          "period": 8,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EE Lab",
          "faculty": "RB/AG"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "PS, NK & RS"
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "PS, NK & RS"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EC Lab",
          "faculty": "PL/NK"
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EC Lab",
          "faculty": "PL/NK"
        },
        {
          "day": "Tuesday",
          "period": 5,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 6,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "PPP"
        },
        {
          "day": "Tuesday",
          "period": 7,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EE Lab",
          "faculty": "RB/AG"
        },
        {
          "day": "Tuesday",
          "period": 8,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EE Lab",
          "faculty": "RB/AG"
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 3,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "PPP"
        },
        {
          "day": "Wednesday",
          "period": 4,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "PL"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EC Lab",
          "faculty": "PL/CH"
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EC Lab",
          "faculty": "PL/CH"
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "HC"
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "DDS"
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-111",
          "faculty": "PM"
        },
        {
          "day": "Friday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "HC"
        },
        {
          "day": "Friday",
          "period": 2,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "DDS"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-111",
          "faculty": "PM"
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-207",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "PL"
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-207",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "CL & RS"
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "CL & RS"
        }
      ]
    },
    {
      "id": "mmmut-btech-ece-b-2025",
      "pageNumber": 15,
      "degree": "B.Tech",
      "branch": "Electronics & Communication Engineering",
      "branchCode": "ECE",
      "section": "SEC-B",
      "room": "TL-207",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics - I",
          "credits": "3-1-0",
          "faculty": "Dr. Harish Chndra (HC) & Km. Kshama Yadav (KY)"
        },
        {
          "code": "BSM-140",
          "name": "Environmental Science and Green Chemistry",
          "credits": "3-0-2",
          "faculty": "PPP, CL, BR & RS"
        },
        {
          "code": "BEE-110",
          "name": "Basic Electrical Engineering",
          "credits": "3-0-2",
          "faculty": "Dr Anukriti Sharma (AS)/Dr Shekhar Yadav (SY)"
        },
        {
          "code": "BEC-106",
          "name": "Electronic Components Testing and Measurement",
          "credits": "2-0-4",
          "faculty": "Dr. Shalabh Kumar Mishra (SKM)/Dr. G. D. Bharti (GDB)/Dr. Prateek (P)"
        },
        {
          "code": "BHS-102",
          "name": "Technical Writing and Professional Communication",
          "credits": "2-1-2",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "SKM"
        },
        {
          "day": "Monday",
          "period": 4,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "PPP"
        },
        {
          "day": "Monday",
          "period": 7,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-207",
          "faculty": "KY"
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "AS"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "HC"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "PPP"
        },
        {
          "day": "Tuesday",
          "period": 6,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 7,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "SKM"
        },
        {
          "day": "Wednesday",
          "period": 1,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "AS"
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "HC"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "CL, BR & RS"
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "CL, BR & RS"
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EC Lab",
          "faculty": "SKM/GDB/P"
        },
        {
          "day": "Thursday",
          "period": 3,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EC Lab",
          "faculty": "SKM/GDB/P"
        },
        {
          "day": "Thursday",
          "period": 3,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-207",
          "faculty": "KY"
        },
        {
          "day": "Thursday",
          "period": 4,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-207",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EE Lab",
          "faculty": "AS/SY"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EE Lab",
          "faculty": "AS/SY"
        },
        {
          "day": "Friday",
          "period": 3,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "HC"
        },
        {
          "day": "Friday",
          "period": 4,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "AS"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EE Lab",
          "faculty": "AS/SY"
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EE Lab",
          "faculty": "AS/SY"
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EC Lab",
          "faculty": "SKM/GDB"
        },
        {
          "day": "Friday",
          "period": 7,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EC Lab",
          "faculty": "SKM/GDB"
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "PPP, CL & RS"
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "PPP, CL & RS"
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-207",
          "faculty": "PPP"
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-207",
          "faculty": ""
        }
      ]
    },
    {
      "id": "mmmut-btech-ece-c-2025",
      "pageNumber": 16,
      "degree": "B.Tech",
      "branch": "Electronics & Communication Engineering",
      "branchCode": "ECE",
      "section": "SEC-C",
      "room": "TL-204",
      "session": "2025-26",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics - I",
          "credits": "3-1-0",
          "faculty": "Dr. Manmohan Pandey (MP) & Km. Shrishti Tripathi (ST)"
        },
        {
          "code": "BSM-140",
          "name": "Environmental Science and Green Chemistry",
          "credits": "3-0-2",
          "faculty": "SJ, PS, NK & RS"
        },
        {
          "code": "BEE-110",
          "name": "Basic Electrical Engineering",
          "credits": "3-0-2",
          "faculty": "Dr Nikhil Kumar (NK)/Dr Shikha Singh (SS)/Ms Anuradha (AT)"
        },
        {
          "code": "BEC-106",
          "name": "Electronic Components Testing and Measurement",
          "credits": "2-0-4",
          "faculty": "Dr. Pragyey Kumar Kaushik (PKK)/Dr. Rajnish/Dr. Vijay Shankar Chaudhary (VSC)"
        },
        {
          "code": "BHS-102",
          "name": "Technical Writing and Professional Communication",
          "credits": "2-1-2",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EC Lab",
          "faculty": "R/VSC"
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EC Lab",
          "faculty": "R/VSC"
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "SJ"
        },
        {
          "day": "Monday",
          "period": 7,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EE Lab",
          "faculty": "SS/AT"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EE Lab",
          "faculty": "SS/AT"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "NK"
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "PKK"
        },
        {
          "day": "Tuesday",
          "period": 6,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EC Lab",
          "faculty": "PKK/VSC"
        },
        {
          "day": "Tuesday",
          "period": 7,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EC Lab",
          "faculty": "PKK/VSC"
        },
        {
          "day": "Tuesday",
          "period": 7,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "SJ & RS"
        },
        {
          "day": "Tuesday",
          "period": 8,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "SJ & RS"
        },
        {
          "day": "Wednesday",
          "period": 1,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "PKK"
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "NK"
        },
        {
          "day": "Wednesday",
          "period": 3,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "PS, NK & RS"
        },
        {
          "day": "Wednesday",
          "period": 4,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "PS, NK & RS"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-204",
          "faculty": "ST"
        },
        {
          "day": "Wednesday",
          "period": 7,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-204",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "MP"
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "SJ"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-204",
          "faculty": "ST"
        },
        {
          "day": "Thursday",
          "period": 7,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-204",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "MP"
        },
        {
          "day": "Friday",
          "period": 2,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "SJ"
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "NK"
        },
        {
          "day": "Friday",
          "period": 7,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EE Lab",
          "faculty": "SS/AT"
        },
        {
          "day": "Friday",
          "period": 8,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EE Lab",
          "faculty": "SS/AT"
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "MP"
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Lang Lab",
          "faculty": ""
        }
      ]
    },
    {
      "id": "mmmut-btech-ece-iot-a-2024",
      "pageNumber": 17,
      "degree": "B.Tech",
      "branch": "Electronics & Comm. Engg (IoT)",
      "branchCode": "ECE(IOT)",
      "section": "SEC-A",
      "room": "TL-204",
      "session": "2024-25",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BSM-110",
          "name": "Engineering Mathematics - I",
          "credits": "3-1-0",
          "faculty": "Dr. Kumar Vineet (KV) & Nandita Tiwari (NT)"
        },
        {
          "code": "BSM-140",
          "name": "Environmental Science and Green Chemistry",
          "credits": "3-0-2",
          "faculty": "PS, PPP, NK & RS"
        },
        {
          "code": "BEE-110",
          "name": "Basic Electrical Engineering",
          "credits": "3-0-2",
          "faculty": "Dr Vivek Patel (VP)/Dr Nikita Prajapati (NP)/Dr Shikha Singh (SS)/Dr Rohit Babu (RB)"
        },
        {
          "code": "BEC-106",
          "name": "Electronic Components Testing and Measurement",
          "credits": "2-0-4",
          "faculty": "Dr. Ram Pravesh (RP)/Dr. Raj Kumar Singh (RK)/Dr. Suyash Kumar (SK)"
        },
        {
          "code": "BHS-102",
          "name": "Technical Writing and Professional Communication",
          "credits": "2-1-2",
          "faculty": "Humanities Dept Faculty"
        },
        {
          "code": "ECA-100",
          "name": "Induction Program",
          "credits": "0-0-0",
          "faculty": "Dean UGS"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "KV"
        },
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "PS"
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "RP"
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EC Lab",
          "faculty": "RP/RK"
        },
        {
          "day": "Monday",
          "period": 7,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EC Lab",
          "faculty": "RP/RK"
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "KV"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "PS"
        },
        {
          "day": "Tuesday",
          "period": 5,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 6,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EE Lab",
          "faculty": "VP/RB"
        },
        {
          "day": "Tuesday",
          "period": 7,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-204",
          "faculty": "NT"
        },
        {
          "day": "Wednesday",
          "period": 3,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 4,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "NP"
        },
        {
          "day": "Wednesday",
          "period": 5,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-204",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 3,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "KV"
        },
        {
          "day": "Thursday",
          "period": 4,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "PS"
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "PPP, NK & RS"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chem Lab",
          "faculty": "PPP, NK & RS"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EC Lab",
          "faculty": "RP/SK"
        },
        {
          "day": "Thursday",
          "period": 7,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "EC Lab",
          "faculty": "RP/SK"
        },
        {
          "day": "Thursday",
          "period": 7,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "EE Lab",
          "faculty": "VP/SS"
        },
        {
          "day": "Friday",
          "period": 1,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "NK & RS"
        },
        {
          "day": "Friday",
          "period": 2,
          "subjectCode": "BSM-140",
          "subjectName": "Environmental Science Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chem Lab",
          "faculty": "NK & RS"
        },
        {
          "day": "Friday",
          "period": 3,
          "subjectCode": "BEC-106",
          "subjectName": "Electronic Components Testing",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "RP"
        },
        {
          "day": "Friday",
          "period": 4,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "NP"
        },
        {
          "day": "Friday",
          "period": 7,
          "subjectCode": "BSM-110",
          "subjectName": "Engineering Mathematics - I (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-204",
          "faculty": "NT"
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Lang Lab",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BHS-102",
          "subjectName": "Technical Writing (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-204",
          "faculty": ""
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BEE-110",
          "subjectName": "Basic Electrical Engineering",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-204",
          "faculty": "NP"
        }
      ]
    },
    {
      "id": "mmmut-bba-a-2026",
      "pageNumber": 18,
      "degree": "BBA",
      "branch": "Business Administration",
      "branchCode": "BBA",
      "section": "SEC-A",
      "room": "TL-113",
      "session": "2026-27",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BBA-114",
          "name": "Financial Accounting",
          "credits": "3-1-0",
          "faculty": "Dr. Ugrasen (UG) / Ms. Swati Gupta (SG)"
        },
        {
          "code": "BBA-115",
          "name": "Principles and Practices of Management",
          "credits": "3-1-0",
          "faculty": "Dr. Javed Alam (JA) / Ms. Akriti Singh (AKS)"
        },
        {
          "code": "BBA-116",
          "name": "Quantitative Techniques for Business Research",
          "credits": "3-1-0",
          "faculty": "Dr. Poonam Ojha (PO) / Ms. Shambhavi Tripathi (ST)"
        },
        {
          "code": "BBA-A01",
          "name": "Business Communication for Managers",
          "credits": "3-1-0",
          "faculty": "Dr. Abdul Jadid (AJ) / Mr. Badal Sharma (BAS)"
        },
        {
          "code": "BHM-121",
          "name": "Industrial Psychology",
          "credits": "3-1-0",
          "faculty": "Dr. Rajput Neetu Kumari"
        },
        {
          "code": "AUC-108",
          "name": "Intellectual Property Rights",
          "credits": "2-0-0",
          "faculty": "Dr. Asim Hasan (AH)"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BBA-114",
          "subjectName": "Financial Accounting",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": "UG"
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BBA-116",
          "subjectName": "Quantitative Techniques (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-113",
          "faculty": "ST"
        },
        {
          "day": "Monday",
          "period": 4,
          "subjectCode": "BBA-114",
          "subjectName": "Financial Accounting (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-113",
          "faculty": "SG"
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BHM-121",
          "subjectName": "Industrial Psychology (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-113",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BHM-121",
          "subjectName": "Industrial Psychology",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BBA-114",
          "subjectName": "Financial Accounting (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-113",
          "faculty": "SG"
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BBA-115",
          "subjectName": "Principles of Management",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": "JA"
        },
        {
          "day": "Tuesday",
          "period": 5,
          "subjectCode": "BBA-A01",
          "subjectName": "Business Communication",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": "AJ"
        },
        {
          "day": "Wednesday",
          "period": 1,
          "subjectCode": "BHM-121",
          "subjectName": "Industrial Psychology",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BBA-114",
          "subjectName": "Financial Accounting",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": "UG"
        },
        {
          "day": "Wednesday",
          "period": 3,
          "subjectCode": "BBA-116",
          "subjectName": "Quantitative Techniques (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-113",
          "faculty": "ST"
        },
        {
          "day": "Wednesday",
          "period": 4,
          "subjectCode": "BBA-115",
          "subjectName": "Principles of Management (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-113",
          "faculty": "AKS"
        },
        {
          "day": "Wednesday",
          "period": 5,
          "subjectCode": "BBA-116",
          "subjectName": "Quantitative Techniques",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": "PO"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BHM-121",
          "subjectName": "Industrial Psychology (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-113",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BHM-121",
          "subjectName": "Industrial Psychology",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": ""
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "AUC-108",
          "subjectName": "Intellectual Property Rights",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": "AH"
        },
        {
          "day": "Thursday",
          "period": 3,
          "subjectCode": "BBA-A01",
          "subjectName": "Business Communication (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-113",
          "faculty": "BAS"
        },
        {
          "day": "Thursday",
          "period": 4,
          "subjectCode": "BBA-115",
          "subjectName": "Principles of Management",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": "JA"
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BBA-A01",
          "subjectName": "Business Communication",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": "AJ"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BBA-116",
          "subjectName": "Quantitative Techniques",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": "PO"
        },
        {
          "day": "Friday",
          "period": 2,
          "subjectCode": "AUC-108",
          "subjectName": "Intellectual Property Rights",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": "AH"
        },
        {
          "day": "Friday",
          "period": 3,
          "subjectCode": "BBA-A01",
          "subjectName": "Business Communication (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-113",
          "faculty": "BAS"
        },
        {
          "day": "Friday",
          "period": 4,
          "subjectCode": "BBA-115",
          "subjectName": "Principles of Management",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": "JA"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BBA-116",
          "subjectName": "Quantitative Techniques",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": "PO"
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BBA-115",
          "subjectName": "Principles of Management (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-113",
          "faculty": "AKS"
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BBA-A01",
          "subjectName": "Business Communication",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": "AJ"
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BBA-114",
          "subjectName": "Financial Accounting",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-113",
          "faculty": "UG"
        }
      ]
    },
    {
      "id": "mmmut-bba-b-2026",
      "pageNumber": 19,
      "degree": "BBA",
      "branch": "Business Administration",
      "branchCode": "BBA",
      "section": "SEC-B",
      "room": "TL-114",
      "session": "2026-27",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BBA-114",
          "name": "Financial Accounting",
          "credits": "3-1-0",
          "faculty": "Dr. Anjali Singh (AS) / Ms. Swati Gupta (SG)"
        },
        {
          "code": "BBA-115",
          "name": "Principles and Practices of Management",
          "credits": "3-1-0",
          "faculty": "Dr. Indal Kumar (IK) / Ms. Akanksha Jaiswal (AKJ)"
        },
        {
          "code": "BBA-116",
          "name": "Quantitative Techniques for Business Research",
          "credits": "3-1-0",
          "faculty": "Dr. Vivaswan Singh (VS) / Ms. Shivangi Yadav (SY)"
        },
        {
          "code": "BBA-A01",
          "name": "Business Communication for Managers",
          "credits": "3-1-0",
          "faculty": "Mr. Sachin Srivastava (SS)/Ms. Kumari Surabhi (KUS)"
        },
        {
          "code": "BHM-121",
          "name": "Industrial Psychology",
          "credits": "3-1-0",
          "faculty": "Ms. Deepshikha Singh"
        },
        {
          "code": "AUC-108",
          "name": "Intellectual Property Rights",
          "credits": "2-0-0",
          "faculty": "Dr. M. Osama (MO)"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BBA-116",
          "subjectName": "Quantitative Techniques",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": "VS"
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BHM-121",
          "subjectName": "Industrial Psychology",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": ""
        },
        {
          "day": "Monday",
          "period": 4,
          "subjectCode": "BBA-115",
          "subjectName": "Principles of Management (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-114",
          "faculty": "AKJ"
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BBA-A01",
          "subjectName": "Business Communication",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": "SS"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BBA-116",
          "subjectName": "Quantitative Techniques (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-114",
          "faculty": "SY"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BHM-121",
          "subjectName": "Industrial Psychology (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-114",
          "faculty": ""
        },
        {
          "day": "Tuesday",
          "period": 4,
          "subjectCode": "BBA-114",
          "subjectName": "Financial Accounting",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": "AS"
        },
        {
          "day": "Tuesday",
          "period": 5,
          "subjectCode": "BBA-115",
          "subjectName": "Principles of Management",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": "IK"
        },
        {
          "day": "Tuesday",
          "period": 6,
          "subjectCode": "BBA-A01",
          "subjectName": "Business Communication",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": "SS"
        },
        {
          "day": "Wednesday",
          "period": 1,
          "subjectCode": "BHM-121",
          "subjectName": "Industrial Psychology",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": "MO"
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "AUC-108",
          "subjectName": "Intellectual Property Rights",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 3,
          "subjectCode": "BBA-114",
          "subjectName": "Financial Accounting (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-114",
          "faculty": "SG"
        },
        {
          "day": "Wednesday",
          "period": 4,
          "subjectCode": "BBA-114",
          "subjectName": "Financial Accounting",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": "AS"
        },
        {
          "day": "Wednesday",
          "period": 5,
          "subjectCode": "BHM-121",
          "subjectName": "Industrial Psychology (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-114",
          "faculty": ""
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BBA-A01",
          "subjectName": "Business Communication (Tutorial)",
          "category": "Tutorial",
          "batch": "P1",
          "room": "TL-114",
          "faculty": "KUS"
        },
        {
          "day": "Thursday",
          "period": 1,
          "subjectCode": "BBA-115",
          "subjectName": "Principles of Management",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": "IK"
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BBA-116",
          "subjectName": "Quantitative Techniques (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-114",
          "faculty": "SY"
        },
        {
          "day": "Thursday",
          "period": 4,
          "subjectCode": "BBA-116",
          "subjectName": "Quantitative Techniques",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": "VS"
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BBA-A01",
          "subjectName": "Business Communication (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-114",
          "faculty": "KUS"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BBA-115",
          "subjectName": "Principles of Management (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-114",
          "faculty": "AKJ"
        },
        {
          "day": "Friday",
          "period": 2,
          "subjectCode": "AUC-108",
          "subjectName": "Intellectual Property Rights",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": "MO"
        },
        {
          "day": "Friday",
          "period": 4,
          "subjectCode": "BBA-115",
          "subjectName": "Principles of Management",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": "IK"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BHM-121",
          "subjectName": "Industrial Psychology",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": ""
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BBA-A01",
          "subjectName": "Business Communication",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": "SS"
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BBA-114",
          "subjectName": "Financial Accounting (Tutorial)",
          "category": "Tutorial",
          "batch": "P2",
          "room": "TL-114",
          "faculty": "SG"
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BBA-114",
          "subjectName": "Financial Accounting",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": "AS"
        },
        {
          "day": "Saturday",
          "period": 4,
          "subjectCode": "BBA-116",
          "subjectName": "Quantitative Techniques",
          "category": "Theory",
          "batch": "ALL",
          "room": "TL-114",
          "faculty": "VS"
        }
      ]
    },
    {
      "id": "mmmut-bpharm-a-2026",
      "pageNumber": 20,
      "degree": "B.Pharm",
      "branch": "Pharmacy",
      "branchCode": "PHARM",
      "section": "SEC-A",
      "room": "L-115",
      "session": "2026-27",
      "semester": "Semester I",
      "batches": [
        "P1",
        "P2",
        "P3",
        "P4"
      ],
      "isVerified": true,
      "subjects": [
        {
          "code": "BPT101T",
          "name": "Basics of Python Programming for Pharmaceutical Sciences",
          "credits": "Theory",
          "faculty": "Dr. Smriti Ojha"
        },
        {
          "code": "BPT102T",
          "name": "General Pharmacy (Theory)",
          "credits": "Theory",
          "faculty": "Anuj Srivastava"
        },
        {
          "code": "BPT103T",
          "name": "Healthcare Psychology and Communication Skills (Theory)",
          "credits": "Theory",
          "faculty": "Mrs. Susmita Chand"
        },
        {
          "code": "BPT104T",
          "name": "Human Anatomy, Physiology and Pathophysiology I (Theory)",
          "credits": "Theory",
          "faculty": "Dr Saba Parveen"
        },
        {
          "code": "BPT105T",
          "name": "Introduction to Pharmacognosy (Theory)",
          "credits": "Theory",
          "faculty": "Dr Anju Verma"
        },
        {
          "code": "BPT106T",
          "name": "Pharmaceutical Inorganic and Analytical Chemistry (Theory)",
          "credits": "Theory",
          "faculty": "Dr Gauri Shankar"
        },
        {
          "code": "BPT107P",
          "name": "General Pharmacy (Practical)",
          "credits": "Practical",
          "faculty": "Mr Ramashankar Dubey/Anuj Srivastava/Sarfaraz Hussain"
        },
        {
          "code": "BPT108P",
          "name": "Healthcare Psychology and Communication Skills (Practical)",
          "credits": "Practical",
          "faculty": "Mr Sandeep Singh/Susmita Chand/Anuj Srivastava"
        },
        {
          "code": "BPT109P",
          "name": "Human Anatomy, Physiology and Pathophysiology I (Practical)",
          "credits": "Practical",
          "faculty": "Dr Rohit Kumar/Safina Khatoon/Mr Pratik Kumar Vishwakarma/Soumya Choudhary"
        },
        {
          "code": "BPT110P",
          "name": "Introduction to Pharmacognosy (Practical)",
          "credits": "Practical",
          "faculty": "Dr Anju Verma/Aparna Mishra/Aradhana"
        },
        {
          "code": "BPT111P",
          "name": "Pharmaceutical Inorganic and Analytical Chemistry (Practical)",
          "credits": "Practical",
          "faculty": "Dr Gauri Shankar/Mrs. Safina Khatoon/Nitin Kumar"
        }
      ],
      "slots": [
        {
          "day": "Monday",
          "period": 2,
          "subjectCode": "BPT108P",
          "subjectName": "Healthcare Psychology Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "CH-206",
          "faculty": "SKS/SP"
        },
        {
          "day": "Monday",
          "period": 3,
          "subjectCode": "BPT108P",
          "subjectName": "Healthcare Psychology Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "CH-206",
          "faculty": "SC/SKS"
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BPT109P",
          "subjectName": "Anatomy & Physiology Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "HAP Lab",
          "faculty": "RK/SY"
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BPT109P",
          "subjectName": "Anatomy & Physiology Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "HAP Lab",
          "faculty": "RK/SY"
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BPT110P",
          "subjectName": "Pharmacognosy Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Micro Lab",
          "faculty": "AV/AD"
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BPT110P",
          "subjectName": "Pharmacognosy Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Micro Lab",
          "faculty": "AV/AD"
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BPT111P",
          "subjectName": "Analytical Chemistry Lab",
          "category": "Lab",
          "batch": "P3",
          "room": "Chemistry Lab",
          "faculty": "GS/NK"
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BPT111P",
          "subjectName": "Analytical Chemistry Lab",
          "category": "Lab",
          "batch": "P3",
          "room": "Chemistry Lab",
          "faculty": "GS/NK"
        },
        {
          "day": "Monday",
          "period": 5,
          "subjectCode": "BPT107P",
          "subjectName": "General Pharmacy Lab",
          "category": "Lab",
          "batch": "P4",
          "room": "P'ceutic Lab",
          "faculty": "AJ/RD"
        },
        {
          "day": "Monday",
          "period": 6,
          "subjectCode": "BPT107P",
          "subjectName": "General Pharmacy Lab",
          "category": "Lab",
          "batch": "P4",
          "room": "P'ceutic Lab",
          "faculty": "AJ/RD"
        },
        {
          "day": "Tuesday",
          "period": 1,
          "subjectCode": "BPT105T",
          "subjectName": "Introduction to Pharmacognosy",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "AV"
        },
        {
          "day": "Tuesday",
          "period": 2,
          "subjectCode": "BPT104T",
          "subjectName": "Human Anatomy & Physiology",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "DSP"
        },
        {
          "day": "Tuesday",
          "period": 3,
          "subjectCode": "BPT106T",
          "subjectName": "Pharmaceutical Inorganic Chemistry",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "GS"
        },
        {
          "day": "Tuesday",
          "period": 5,
          "subjectCode": "BPT108P",
          "subjectName": "Healthcare Psychology Lab",
          "category": "Lab",
          "batch": "P3",
          "room": "Micro Lab",
          "faculty": "SC/SKS"
        },
        {
          "day": "Tuesday",
          "period": 7,
          "subjectCode": "BPT108P",
          "subjectName": "Healthcare Psychology Lab",
          "category": "Lab",
          "batch": "P4",
          "room": "Micro Lab",
          "faculty": "SC/SKS"
        },
        {
          "day": "Wednesday",
          "period": 1,
          "subjectCode": "BPT104T",
          "subjectName": "Human Anatomy & Physiology",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "DSP"
        },
        {
          "day": "Wednesday",
          "period": 2,
          "subjectCode": "BPT102T",
          "subjectName": "General Pharmacy",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "AJ"
        },
        {
          "day": "Wednesday",
          "period": 3,
          "subjectCode": "BPT106T",
          "subjectName": "Pharmaceutical Inorganic Chemistry",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "GS"
        },
        {
          "day": "Wednesday",
          "period": 4,
          "subjectCode": "BPT103T",
          "subjectName": "Healthcare Psychology",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "SC"
        },
        {
          "day": "Wednesday",
          "period": 5,
          "subjectCode": "BPT110P",
          "subjectName": "Pharmacognosy Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Micro Lab",
          "faculty": "AV/AD"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BPT110P",
          "subjectName": "Pharmacognosy Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Micro Lab",
          "faculty": "AV/AD"
        },
        {
          "day": "Wednesday",
          "period": 5,
          "subjectCode": "BPT111P",
          "subjectName": "Analytical Chemistry Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chemistry Lab",
          "faculty": "GS/TA"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BPT111P",
          "subjectName": "Analytical Chemistry Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "Chemistry Lab",
          "faculty": "GS/TA"
        },
        {
          "day": "Wednesday",
          "period": 5,
          "subjectCode": "BPT107P",
          "subjectName": "General Pharmacy Lab",
          "category": "Lab",
          "batch": "P3",
          "room": "P'ceutic Lab",
          "faculty": "AJ/RD"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BPT107P",
          "subjectName": "General Pharmacy Lab",
          "category": "Lab",
          "batch": "P3",
          "room": "P'ceutic Lab",
          "faculty": "AJ/RD"
        },
        {
          "day": "Wednesday",
          "period": 5,
          "subjectCode": "BPT109P",
          "subjectName": "Anatomy & Physiology Lab",
          "category": "Lab",
          "batch": "P4",
          "room": "HAP Lab",
          "faculty": "SK/PKV"
        },
        {
          "day": "Wednesday",
          "period": 6,
          "subjectCode": "BPT109P",
          "subjectName": "Anatomy & Physiology Lab",
          "category": "Lab",
          "batch": "P4",
          "room": "HAP Lab",
          "faculty": "SK/PKV"
        },
        {
          "day": "Thursday",
          "period": 2,
          "subjectCode": "BPT101T",
          "subjectName": "Python Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "SO"
        },
        {
          "day": "Thursday",
          "period": 3,
          "subjectCode": "BPT104T",
          "subjectName": "Human Anatomy & Physiology",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "DSP"
        },
        {
          "day": "Thursday",
          "period": 4,
          "subjectCode": "BPT105T",
          "subjectName": "Introduction to Pharmacognosy",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "AV"
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BPT111P",
          "subjectName": "Analytical Chemistry Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chemistry Lab",
          "faculty": "GS/TA"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BPT111P",
          "subjectName": "Analytical Chemistry Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "Chemistry Lab",
          "faculty": "GS/TA"
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BPT107P",
          "subjectName": "General Pharmacy Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "P'ceutic Lab",
          "faculty": "AJ/SH"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BPT107P",
          "subjectName": "General Pharmacy Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "P'ceutic Lab",
          "faculty": "AJ/SH"
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BPT109P",
          "subjectName": "Anatomy & Physiology Lab",
          "category": "Lab",
          "batch": "P3",
          "room": "HAP Lab",
          "faculty": "SK/PKV"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BPT109P",
          "subjectName": "Anatomy & Physiology Lab",
          "category": "Lab",
          "batch": "P3",
          "room": "HAP Lab",
          "faculty": "SK/PKV"
        },
        {
          "day": "Thursday",
          "period": 5,
          "subjectCode": "BPT110P",
          "subjectName": "Pharmacognosy Lab",
          "category": "Lab",
          "batch": "P4",
          "room": "Micro Lab",
          "faculty": "AV/AM"
        },
        {
          "day": "Thursday",
          "period": 6,
          "subjectCode": "BPT110P",
          "subjectName": "Pharmacognosy Lab",
          "category": "Lab",
          "batch": "P4",
          "room": "Micro Lab",
          "faculty": "AV/AM"
        },
        {
          "day": "Friday",
          "period": 1,
          "subjectCode": "BPT102T",
          "subjectName": "General Pharmacy",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "AJ"
        },
        {
          "day": "Friday",
          "period": 2,
          "subjectCode": "BPT106T",
          "subjectName": "Pharmaceutical Inorganic Chemistry",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "GS"
        },
        {
          "day": "Friday",
          "period": 3,
          "subjectCode": "BPT104T",
          "subjectName": "Human Anatomy & Physiology",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "DSP"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BPT107P",
          "subjectName": "General Pharmacy Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "P'ceutic Lab",
          "faculty": "AJ/SH"
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BPT107P",
          "subjectName": "General Pharmacy Lab",
          "category": "Lab",
          "batch": "P1",
          "room": "P'ceutic Lab",
          "faculty": "AJ/SH"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BPT109P",
          "subjectName": "Anatomy & Physiology Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "HAP Lab",
          "faculty": "RK/SY"
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BPT109P",
          "subjectName": "Anatomy & Physiology Lab",
          "category": "Lab",
          "batch": "P2",
          "room": "HAP Lab",
          "faculty": "RK/SY"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BPT110P",
          "subjectName": "Pharmacognosy Lab",
          "category": "Lab",
          "batch": "P3",
          "room": "Micro Lab",
          "faculty": "AV/AM"
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BPT110P",
          "subjectName": "Pharmacognosy Lab",
          "category": "Lab",
          "batch": "P3",
          "room": "Micro Lab",
          "faculty": "AV/AM"
        },
        {
          "day": "Friday",
          "period": 5,
          "subjectCode": "BPT111P",
          "subjectName": "Analytical Chemistry Lab",
          "category": "Lab",
          "batch": "P4",
          "room": "Chemistry Lab",
          "faculty": "GS/NK"
        },
        {
          "day": "Friday",
          "period": 6,
          "subjectCode": "BPT111P",
          "subjectName": "Analytical Chemistry Lab",
          "category": "Lab",
          "batch": "P4",
          "room": "Chemistry Lab",
          "faculty": "GS/NK"
        },
        {
          "day": "Saturday",
          "period": 1,
          "subjectCode": "BPT101T",
          "subjectName": "Python Programming",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "SO"
        },
        {
          "day": "Saturday",
          "period": 2,
          "subjectCode": "BPT105T",
          "subjectName": "Introduction to Pharmacognosy",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "AV"
        },
        {
          "day": "Saturday",
          "period": 3,
          "subjectCode": "BPT102T",
          "subjectName": "General Pharmacy",
          "category": "Theory",
          "batch": "ALL",
          "room": "CH-206",
          "faculty": "AJ"
        }
      ]
    }
  ]
};

// ==============================================================================
// Authoritative Branch & Section Mappings for MMMUT
// Source of truth for student filters, CR appointments, and timetable management
// ==============================================================================

export const BRANCH_SECTIONS_MAP: Record<string, string[]> = {
  CSE: ["SEC-A", "SEC-B", "SEC-C", "SEC-D", "SEC-E"],
  ECE: ["SEC-A", "SEC-B", "SEC-C"],
  IT: ["SEC-A", "SEC-B"],
  ME: ["SEC-A", "SEC-B"],
  CE: ["SEC-A", "SEC-B"],
  EE: ["SEC-A", "SEC-B"],
  BBA: ["SEC-A", "SEC-B"],
  CHE: ["SEC-A"],
  "ECE(IOT)": ["SEC-A"],
  PHARM: ["SEC-A"],
};

export const BRANCH_NAMES_MAP: Record<string, string> = {
  CSE: "Computer Science & Engineering",
  ECE: "Electronics & Communication Engineering",
  IT: "Information Technology",
  ME: "Mechanical Engineering",
  CE: "Civil Engineering",
  EE: "Electrical Engineering",
  BBA: "Bachelor of Business Administration",
  CHE: "Chemical Engineering",
  "ECE(IOT)": "ECE (Internet of Things)",
  PHARM: "Pharmacy",
};

export function getSectionsForBranch(branchCode: string): string[] {
  if (!branchCode || branchCode === "ALL") {
    // All known unique sections across MMMUT
    return ["SEC-A", "SEC-B", "SEC-C", "SEC-D", "SEC-E"];
  }
  return BRANCH_SECTIONS_MAP[branchCode] || ["SEC-A", "SEC-B"];
}

export function getAllBranches(): { code: string; name: string }[] {
  return Object.keys(BRANCH_SECTIONS_MAP).map((code) => ({
    code,
    name: BRANCH_NAMES_MAP[code] || code,
  }));
}

export function normalizeSection(section?: string): string {
  if (!section) return "";
  const s = section.trim().toUpperCase().replace(/\s+/g, "");
  if (s.startsWith("SEC-")) return s;
  if (s.startsWith("SEC")) return `SEC-${s.replace(/^SEC/, "")}`;
  if (["A", "B", "C", "D", "E"].includes(s)) return `SEC-${s}`;
  return s;
}

export function getBranchFullName(branchCode?: string): string {
  if (!branchCode) return "Engineering";
  const code = branchCode.trim().toUpperCase();
  return BRANCH_NAMES_MAP[code] || branchCode || "Engineering";
}

export function findTimetableForStudent(params: {
  branchCode?: string;
  section?: string;
  timetableId?: string;
  academicYear?: string;
  semester?: string;
}): UniversityTimetable | null {
  const branchCode = (params.branchCode || "").trim().toUpperCase();
  const normSec = normalizeSection(params.section);
  const targetYear = params.academicYear || "1st Year";

  // Prevent 2nd, 3rd, or 4th year students from receiving 1st-year static timetables
  const isTargetFirstYear = targetYear === "1st Year";

  // 1. Authoritative match by branch code, normalized section, and academic year
  if (branchCode && normSec) {
    const matched = UNIVERSITY_DATABASE.timetables.find((t) => {
      const ttYear = t.academicYear || "1st Year";
      if (!isTargetFirstYear && ttYear === "1st Year") return false;
      return t.branchCode.toUpperCase() === branchCode && t.section.toUpperCase() === normSec;
    });
    if (matched) return matched;
  }

  // 2. Fallback to timetableId ONLY if it belongs to the same branch and year
  if (params.timetableId) {
    const byId = UNIVERSITY_DATABASE.timetables.find((t) => t.id === params.timetableId);
    if (byId) {
      const ttYear = byId.academicYear || "1st Year";
      if ((isTargetFirstYear || ttYear === targetYear) && (!branchCode || byId.branchCode.toUpperCase() === branchCode)) {
        return byId;
      }
    }
  }

  // 3. Strictly zero cross-year or cross-branch universal fallbacks
  return null;
}
