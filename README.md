# AttendX

AttendX is a student-oriented attendance tracking and analytics web application designed to help students monitor their attendance, manage timetables, track subject-wise attendance, and estimate their eligibility against attendance requirements. It provides a centralized platform for students to stay informed about their academic attendance.

# Project Members
Shubh Pandey | 2026071160  
Saksham Tiwari | 2026071150  
Himanshu Singh | 2026071130  
Yuvraj Singh | 20260701169  

## Features
* Student attendance tracking and subject-wise analytics
* Attendance percentage calculation and 75% eligibility calculator
* Personal timetable management with recurring and date-specific classes
* Class Cancellation Reports and cancellation verification
* Attendance history with CSV and Excel export
* Class polls, announcements, and notifications
* Separate tracking of theory classes and practical/lab sessions
* Student, CR, and administrator access with role-based permissions
* Demo account for exploring the application

## Tech Stack
* **Frontend:** Next.js, React, TypeScript, Tailwind CSS
* **Backend:** Next.js API Routes and server-side logic
* **Database:** Supabase PostgreSQL
* **Authentication:** Supabase Auth
* **Notifications:** Web Push Notifications
* **Deployment:** Vercel
* **Version Control:** Git and GitHub

## Prerequisites
* Node.js (LTS version recommended)
* npm
* Git
* A Supabase project for local development

## Installation & Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/notsosincerepandey/AttendX.git
   cd AttendX
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure the environment:**

   Create a `.env.local` file in the root directory and configure the required Supabase and application environment variables.

4. **Run the application:**
   ```bash
   npm run dev
   ```

5. **Open the application:**

   Visit `http://localhost:3000` in your browser.

## Usage
Visit the deployed application:

**Website:** https://attend-x-green.vercel.app

Students can log in to view their attendance dashboard, subject-wise attendance, timetable, attendance history, calculate attendance requirements, and access other available features.

### Demo Account
Use the following demo credentials to explore the application:

* **Roll Number:** `DEMO2026`
* **Email:** `demo.student@attendx.app`
* **Password:** `Demo@AttendX2026`

**Login:** https://attend-x-green.vercel.app/login

The demo account is intended for demonstration purposes only.
