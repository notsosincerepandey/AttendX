const fs = require('fs');
const path = require('path');

const cover = `# AttendX — Complete Project Documentation & University Viva Preparation Booklet

---

**Project Title:** AttendX (Autonomous Academic Attendance Intelligence & Schedule Synchronization Engine)  
**Target Institution:** Madan Mohan Malaviya University of Technology (MMMUT), Gorakhpur  
**Academic Session:** 2026–2027  
**Framework Version:** Next.js 16.4.5 (App Router, Turbopack) | React 19.3.0 | TypeScript 5  
**Database Platform:** Supabase Cloud PostgreSQL 15 (\`iczjocbishkvkkkfvalz\`)  
**Deployment Platform:** Vercel Production (\`attend-x.vercel.app\`)  
**Active Cohort:** 1,189 Verified Genuine B.Tech Engineering Students  
**Document Classification:** Master Technical Architecture, Implementation Audit & Comprehensive Viva Handbook  

---

## MASTER TABLE OF CONTENTS

- [PART 1 — PROJECT OVERVIEW](#part-1--project-overview)
  - 1.1 Executive Summary & Introduction
  - 1.2 Origin Story & Motivation
  - 1.3 The Problem Statement
  - 1.4 Project Objectives
  - 1.5 Target Users & Persona Profiles
  - 1.6 Scope and Real-World Application
  - 1.7 Current Limitations
  - 1.8 Comparison: AttendX vs. Traditional University Systems
  - 1.9 Why Student-Maintained Tracking Is Essential
- [PART 2 — TECHNOLOGY STACK](#part-2--technology-stack)
  - 2.1 Complete Architectural Stack Overview
  - 2.2 Deep Dive into Every Technology Used
  - 2.3 Master Technology Stack Matrix
- [PART 3 — COMPLETE SYSTEM ARCHITECTURE](#part-3--complete-system-architecture)
  - 3.1 High-Level Architectural Philosophy
  - 3.2 Master System Architecture Diagram (Mermaid)
  - 3.3 Component-by-Component Architectural Breakdown
- [PART 4 — CONNECTIONS: THE MOST IMPORTANT SECTION](#part-4--connections-the-most-important-section)
  - 4.1 Frontend-to-Backend Connections (Complete API Catalog)
  - 4.2 Application-to-Database Connections (Client init, environment variables, PostgREST queries)
  - 4.3 Authentication Connections (Roll Number mapping, internal alias, GoTrue Auth)
  - 4.4 Authorization Connections & Role Enforcement (\`requireRole\`, student vs CR vs admin)
  - 4.5 Database Relationships & Master Entity-Relationship (ER) Diagram (Mermaid)
  - 4.6 External Service Connections (Supabase, Web Push, Vercel Cron)
  - 4.7 Deployment Connections: GitHub -> Vercel -> Production (CI/CD Pipeline Diagram)
- [PART 5 — DATABASE DEEP DIVE](#part-5--database-deep-dive)
  - 5.1 Relational Architecture & Schema Philosophy
  - 5.2 Table-by-Table Schema Specification (All 25 relational tables)
  - 5.3 PostgreSQL Row Level Security (RLS) Policies
  - 5.4 Database Flow of Important Operations (Login hydration, Cron push dispatch)
- [PART 6 — AUTHENTICATION AND SECURITY](#part-6--authentication-and-security)
  - 6.1 Authentication Architecture & Student Identification
  - 6.2 Authentication Flow Diagram (Mermaid Sequence)
  - 6.3 Dual-Token Session Architecture (3-part Supabase JWT vs 2-part HMAC token)
  - 6.4 One-Time Mandatory Password Rotation Mechanism
  - 6.5 Public vs. Private Credentials & Environment Isolation
  - 6.6 Formal Security Audit Matrix (Implemented defenses vs risks vs future work)
- [PART 7 — FEATURE-BY-FEATURE EXPLANATION](#part-7--feature-by-feature-explanation)
  - 7.1 Complete Feature Directory
  - 7.2 Deep Dive into Every Application Feature (All 15 implemented features)
- [PART 8 — ATTENDANCE LOGIC & MATHEMATICAL ENGINE](#part-8--attendance-logic--mathematical-engine)
  - 8.1 The Mathematics of Attendance Management
  - 8.2 Primary Mathematical Formulations (Percentage, Safe Absences floor formula, Recovery ceiling formula, What-If simulation)
  - 8.3 Avoiding Simpson's Paradox: Theory vs. Practical Aggregation
  - 8.4 Concrete Worked Numerical Examples (Aaryan compliant vs Nitin debarment scenario)
  - 8.5 Client vs. Server Calculation Architecture
- [PART 9 — TIMETABLE SYSTEM](#part-9--timetable-system)
  - 9.1 The University Master Timetable Database (21 master schedules)
  - 9.2 Timetable Selection Flowchart (Mermaid)
  - 9.3 Practical Batch Discrepancy Filtering (Batch P1 vs. P2)
  - 9.4 The Root Cause & Resolution of the Branch-Wise Bug (Nitin Kumar ECE TL-207 case study)
- [PART 10 — API AND CODEBASE EXPLORATION](#part-10--api-and-codebase-exploration)
  - 10.1 Directory Layout & Codebase Structure
  - 10.2 Master Codebase Reference Table
  - 10.3 Walkthrough of the Most Important Files
- [PART 11 — HOW DATA FLOWS THROUGH ATTENDX](#part-11--how-data-flows-through-attendx)
  - 11.1 Master Data Lifecycle Walkthrough (7 detailed scenarios with diagrams)
- [PART 12 — PROJECT DEMONSTRATION GUIDE](#part-12--project-demonstration-guide)
  - 12.1 The 16-Step Master Demonstration Script (What to click, show, say, and professor questions)
- [PART 13 — PROFESSOR VIVA QUESTIONS AND ANSWERS](#part-13--professor-viva-questions-and-answers)
  - 90 Comprehensive Viva Q&As across 9 distinct categories
- [PART 14 — CONNECTIONS AND INTEGRATIONS VIVA DEFENSE GUIDE](#part-14--connections-and-integrations-viva-defense-guide)
  - 14.1 The Top 16 'Show Me' Defense Blueprints (Exact files, screen pointing, and spoken defense)
- [PART 15 — TECHNICAL GLOSSARY](#part-15--technical-glossary)
  - 15.1 Comprehensive Technical Terms Dictionary (50+ terms with simple, technical, and project meanings)
- [PART 16 — LIMITATIONS AND FUTURE SCOPE](#part-16--limitations-and-future-scope)
  - 16.1 Honest Evaluation of Current Boundaries
  - 16.2 Technical Limitations Deep Dive
  - 16.3 Structured Future Scope & Engineering Roadmap (Phases 1, 2, and 3)
- [PART 17 — PRACTICAL TROUBLESHOOTING REFERENCE](#part-17--practical-troubleshooting-reference)
  - 17.1 Quick Diagnostic Matrix
  - 17.2 Systematic Diagnostic Workflows (12 common troubleshooting scenarios)
- [PART 18 — QUICK REVISION SHEET (PRE-VIVA CRAM GUIDE)](#part-18--quick-revision-sheet-pre-viva-cram-guide)
  - 18.1 AttendX at a Glance
  - 18.2 Spoken Project Introductions (60s pitch, 2min pitch, 5min deep dive)
  - 18.3 The Top 20 Most Critical Viva Questions

---

`;

const chaptersDir = path.join(__dirname, '..', 'docs', 'chapters');
const chapterFiles = fs.readdirSync(chaptersDir).sort();

let masterContent = cover + '\n\n';

for (const file of chapterFiles) {
  if (file.endsWith('.md')) {
    const chapterPath = path.join(chaptersDir, file);
    const content = fs.readFileSync(chapterPath, 'utf8');
    masterContent += '\n\n---\n\n' + content + '\n\n';
  }
}

const outputPath = path.join(__dirname, '..', 'docs', 'AttendX_Complete_Project_Guide.md');
fs.writeFileSync(outputPath, masterContent, 'utf8');
console.log('Successfully generated docs/AttendX_Complete_Project_Guide.md. Size:', masterContent.length, 'bytes');
