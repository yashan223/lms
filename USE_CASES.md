# 📊 EduPulse LMS — Use Case Architecture & Diagrams

This document provides a comprehensive use case specification, UML diagrams, actor definitions, and functional boundaries for the **EduPulse London A/L & O/L Academy Platform**.

---

## 👥 System Actors

| Actor | Description |
| :--- | :--- |
| **🎓 Student** | Purchases learning hour tokens, allocates hours across 1-on-1 private tutoring and live classes, enrolls in courses, accesses syllabus materials & past papers, attends live interactive classes, manages study calendar, reschedules sessions, and messages faculty tutors. |
| **👨‍🏫 Faculty Tutor** | Curates course syllabus and lesson materials, schedules and launches live video seminars, reviews enrolled student cohorts, conducts 1-on-1 consultations, and communicates with students. |
| **🛡️ System Administrator** | Manages courses, subjects, token pricing, and curriculum publication; administers user accounts, credentials, and roles; monitors live sessions; and audits platform analytics & clearances. |

---

## 🌐 1. High-Level System Use Case Diagram

```mermaid
flowchart LR
    %% Actors on the Left
    subgraph Actors ["👥 System Actors"]
        direction TB
        Student["🎓 Student"]
        Tutor["👨‍🏫 Faculty Tutor"]
        Admin["🛡️ System Admin"]
    end

    %% Platform Boundary in the Center
    subgraph Platform ["🏫 EduPulse LMS Platform Boundary"]
        direction TB

        subgraph CoreArea ["🔐 Authentication & Communication"]
            direction TB
            UC_Auth(["Sign In / Sign Up / Reset Password"])
            UC_Profile(["Manage Profile & Bio"])
            UC_Notif(["Real-Time Notifications"])
            UC_Chat(["Direct Academic Messaging"])
        end

        subgraph StudentArea ["🎓 Student Learning Portal & Wallet"]
            direction TB
            UC_Tokens(["Purchase & Manage Hour Tokens"])
            UC_Spend(["Allocate Hours (1-on-1 / Masterclass)"])
            UC_Browse(["Browse & Enroll in Courses"])
            UC_Materials(["Access Lessons & Study Guides"])
            UC_JoinLive(["Join Live Class / Meet Room"])
            UC_Calendar(["Manage Calendar & Reschedule"])
            UC_Trial(["Book 1-on-1 Consultation / Trial"])
            UC_Vault(["Manage Private Study Vault"])
        end

        subgraph TutorArea ["👨‍🏫 Faculty Tutor Studio"]
            direction TB
            UC_Schedule(["Schedule & Host Live Classes"])
            UC_Syllabus(["Manage Syllabus & Course Materials"])
            UC_Roster(["View Enrolled Students & Cohorts"])
            UC_ConductTrial(["Approve & Conduct 1-on-1 Consultations"])
        end

        subgraph AdminArea ["🛡️ Admin Command Console"]
            direction TB
            UC_Courses(["Create, Edit & Publish Courses"])
            UC_Users(["Manage Users, Roles & Credentials"])
            UC_Observe(["Monitor & Observe Live Classes"])
            UC_Analytics(["Review Platform & Financial Analytics"])
        end
    end

    %% Student Connections
    Student --> UC_Auth
    Student --> UC_Profile
    Student --> UC_Notif
    Student --> UC_Chat
    Student --> UC_Tokens
    Student --> UC_Spend
    Student --> UC_Browse
    Student --> UC_Materials
    Student --> UC_JoinLive
    Student --> UC_Calendar
    Student --> UC_Trial
    Student --> UC_Vault

    %% Tutor Connections
    Tutor --> UC_Auth
    Tutor --> UC_Profile
    Tutor --> UC_Notif
    Tutor --> UC_Chat
    Tutor --> UC_Schedule
    Tutor --> UC_Syllabus
    Tutor --> UC_Roster
    Tutor --> UC_ConductTrial
    Tutor --> UC_JoinLive

    %% Admin Connections
    Admin --> UC_Auth
    Admin --> UC_Profile
    Admin --> UC_Notif
    Admin --> UC_Courses
    Admin --> UC_Users
    Admin --> UC_Observe
    Admin --> UC_Analytics
    Admin --> UC_Schedule
```

---

## 🎓 2. Student Portal Use Case Diagram

```mermaid
flowchart LR
    Student["🎓 Student"]

    subgraph StudentPortal ["Student Learning Portal (/dashboard)"]
        direction TB
        UC_S0(["Purchase Token Hours Pack"])
        UC_S1(["Browse Subject Courses"])
        UC_S2(["Enroll in Curriculum Unit"])
        UC_S3(["Access Lecture Notes & Video Materials"])
        UC_S4(["Join Scheduled Live Class Room"])
        UC_S5(["View Academic Calendar & Events"])
        UC_S6(["Reschedule Live Class Session"])
        UC_S7(["Request 1-on-1 Tutor Consultation"])
        UC_S8(["Upload & Manage Private Study Files"])
        UC_S9(["Send & Receive Direct Messages"])
    end

    Student --> UC_S0
    Student --> UC_S1
    Student --> UC_S2
    Student --> UC_S3
    Student --> UC_S4
    Student --> UC_S5
    Student --> UC_S6
    Student --> UC_S7
    Student --> UC_S8
    Student --> UC_S9
```

---

## 👨‍🏫 3. Faculty Tutor Studio Use Case Diagram

```mermaid
flowchart LR
    Tutor["👨‍🏫 Faculty Tutor"]

    subgraph TutorStudio ["Tutor Studio (/tutor)"]
        direction TB
        UC_T1(["Schedule Live Masterclass / Seminar"])
        UC_T2(["Launch & Host Google Meet Class"])
        UC_T3(["Upload Lesson Handouts & Materials"])
        UC_T4(["Review Enrolled Student Records"])
        UC_T5(["Manage 1-on-1 Student Consultations"])
        UC_T6(["Reschedule Consultation Sessions"])
        UC_T7(["Update Faculty Bio, Degrees & Certifications"])
        UC_T8(["Direct Academic Messaging with Students"])
    end

    Tutor --> UC_T1
    Tutor --> UC_T2
    Tutor --> UC_T3
    Tutor --> UC_T4
    Tutor --> UC_T5
    Tutor --> UC_T6
    Tutor --> UC_T7
    Tutor --> UC_T8
```

---

## 🛡️ 4. Administrator Console Use Case Diagram

```mermaid
flowchart LR
    Admin["🛡️ System Administrator"]

    subgraph AdminConsole ["Admin Command Console (/admin)"]
        direction TB
        UC_A1(["Create, Edit & Publish Courses"])
        UC_A2(["Manage Course Modules & Lessons"])
        UC_A3(["Upload Course Handouts & Resources"])
        UC_A4(["Manage Users & Assign Roles"])
        UC_A5(["Reset User Passwords & Credentials"])
        UC_A6(["Schedule Academy-Wide Live Classes"])
        UC_A7(["Observe & Terminate Live Class Rooms"])
        UC_A8(["Review Platform Revenue & Clearances"])
    end

    Admin --> UC_A1
    Admin --> UC_A2
    Admin --> UC_A3
    Admin --> UC_A4
    Admin --> UC_A5
    Admin --> UC_A6
    Admin --> UC_A7
    Admin --> UC_A8
```

---

## 📋 Summary of Functional Modules

### 1. Authentication & Identity
- **Sign In / Sign Up**: Email-based authentication with role-based routing (`/dashboard` for Student, `/tutor` for Tutor, `/admin` for Admin).
- **Password Recovery**: Secure reset workflow with token verification.
- **Direct Messaging**: Real-time communication between students and faculty tutors.
- **Real-Time Sync**: Server-Sent Events (SSE) for instant calendar and notification updates.

### 2. Student Learning & Token Economy (`/dashboard`)
- **Token Purchase & Hours Economy**: Students purchase token bundles (6h, 16h, 24h) and receive 1 token per hour. Students freely manage their time and decide where to spend their tokens (1-on-1 private tutoring, interactive masterclasses, topic drills, or exam past paper reviews).
- **Course Enrollment**: Instant enrollment into accredited Pearson Edexcel and Cambridge units.
- **Study Materials**: Access to course modules, lesson videos, and downloadable handouts (no assignment submissions or grading).
- **Live Class Participation**: Direct Google Meet room integration with live status indicators.
- **Self-Service Rescheduling**: Interactive reschedule modal for class sessions.
- **Private File Vault**: Cloud storage for personal homework and study notes.

### 3. Faculty Tutor Studio (`/tutor`)
- **Live Class Orchestration**: Schedule live seminars, launch video rooms, and record class durations.
- **Curriculum Management**: Add and manage modules, lessons, and course attachments.
- **Student Roster**: Filter and review enrolled students by course, initiate direct contact, and schedule 1-on-1 consultations.
- **Faculty Profile**: Showcase academic degrees, examiner certifications, and office hours.

### 4. Admin Command Console (`/admin`)
- **Course Administration**: Full CRUD on syllabus courses, level categorization, and pricing.
- **User Governance**: Create and edit student/tutor/admin accounts and credentials.
- **Live Session Monitoring**: Real-time overview of active classes across all faculties.
- **Financial Analytics**: Automated calculation of platform revenues, tutor honorarium clearances, and enrollment metrics.
