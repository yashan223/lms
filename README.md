# 🎓 EduPulse | London A/L & O/L Academy LMS

EduPulse is a unified, multi-role Learning Management System (LMS) designed for London GCE Advanced Level (A/L) and Ordinary Level (O/L) education (Pearson Edexcel & Cambridge International specifications). It integrates student learning portals, faculty instruction studios, and administrative command consoles.

---

## 👥 User Roles & Portals

| Role | Access URL | Core Capabilities |
| :--- | :--- | :--- |
| **🎓 Student** | `/dashboard` | Enrolls in syllabus courses, accesses lesson modules & study guides, joins live classes, manages personal calendar, uploads private study files, and chats with faculty tutors. |
| **👨‍🏫 Faculty Instructor** | `/tutor` | Schedules and launches live interactive masterclasses, manages syllabus content, reviews enrolled student rosters, conducts 1-on-1 consultations, and communicates with students. |
| **🛡️ System Administrator** | `/admin` | Curates courses and syllabus units, assigns faculty, manages user accounts and roles, monitors live classes, and oversees platform analytics & honors clearances. |

---

## 📊 System Architecture & Use Cases

Detailed use case flows, system boundaries, and the full interactive **Mermaid Use Case Diagram** are documented on the dedicated use cases page:

👉 **[View Full Use Case Architecture & Diagram (USE_CASES.md)](./USE_CASES.md)**

---

## 🛠️ Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions, API Routes)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **Database & ORM**: [Prisma ORM](https://www.prisma.io/) with SQLite / PostgreSQL
- **Real-Time Sync**: Server-Sent Events (SSE)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/yashan223/lms.git
cd edu-lms
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./dev.db"
```

### 3. Initialize the Database
```bash
npx prisma db push
npx prisma db seed
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
edu-lms/
├── app/
│   ├── admin/          # Admin command console
│   ├── tutor/          # Faculty instructor studio
│   ├── dashboard/      # Student learning portal
│   ├── courses/        # Course catalog and course detail pages
│   ├── api/            # REST API endpoints (auth, chat, courses, events, tutor, etc.)
│   ├── login/          # User authentication
│   └── register/       # User registration
├── components/
│   ├── chat/           # Direct academic messaging drawer
│   ├── layout/         # Header, Navbar, Footer
│   ├── landing/        # Showcase, Hero, Testimonials
│   ├── notifications/  # Real-time notification bell
│   └── ui/             # Reusable UI primitives (Buttons, Modals, Badges)
├── prisma/             # Schema definition & database seeding scripts
└── public/             # Branding logos, imagery, and static assets
```

---

## 📄 License
MIT License. Developed for EduPulse London A/L & O/L Academy.
