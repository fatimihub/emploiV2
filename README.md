# Dans cette version : ajout du dossier docs, reglement de qq bugs
# Timetable Generator ISTA


Automated timetable generation desktop application for **ISTA (Institut Spécialisé de Technologie Appliquée)**. Built with React + Node.js, packaged as a desktop app with Electron.
<img width="1920" height="1080" alt="Timetable Generator" src="https://github.com/user-attachments/assets/0955c850-a7e7-4703-9193-8db98f551ae6" />

---

## Stack

### Frontend

- **React 18** + **TypeScript**
- **Vite** (dev server & build)
- **TailwindCSS** (styling)
- **React Router DOM** (navigation)
- **Axios** (API calls)
- **html2canvas** + **JSZip** + **file-saver** (timetable export to PNG / ZIP)
- **FontAwesome** (icons)
- **@dnd-kit** (drag and drop)
- **Electron** (desktop wrapper)

### Backend

- **Node.js** + **Express**
- **Sequelize ORM** + **SQLite**
- **JWT** (authentication)
- **Multer** (file uploads — avatar images)
- **ExcelJS** (Excel import / export)

---

## Features

- **Branch, Module, Group management**
- **Formateur management** — availability per day, assigned classrooms and modules
- **Classroom management** — physical rooms assigned to formateurs
- **Group Merges** — shared remote sessions across groups
- **Stages (Training periods)** — groups on stage are excluded from generation
- **Per-group timetable viewer** and **per-formateur yearly timetable viewer**
- **Download** timetable as PNG, or all formateurs as ZIP
- **Export** Excel
- **Administrator profile** — name, email, password, avatar upload
- **Generation reports** stored per group in the database (French admin reports)
- Timetables archived automatically before each new generation

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
# Clone
git clone https://github.com/Elmahdijaouali/Timetable-Generator-ISTA.git
cd Timetable-Generator-ISTA

# Install
npm install
cd backend && npm install && cd ..

# Start (frontend + backend)
npm run dev
```

- **Frontend**: http://127.0.0.1:5173
- **Backend API**: http://127.0.0.1:8002

---

## Scripts

| Script                   | Description                    |
| ------------------------ | ------------------------------ |
| `npm run dev`            | Frontend + backend in parallel |
| `npm run dev:frontend`   | Vite frontend only             |
| `npm run dev:backend`    | Express backend only           |
| `npm run build`          | Production build               |
| `npm run build:electron` | Desktop app build              |
| `npm run build:win`      | Windows `.exe`                 |
| `npm run build:linux`    | Linux `.AppImage`              |
| `npm run build:mac`      | macOS `.dmg`                   |
| `npm run lint`           | ESLint                         |

---

## Database

SQLite: `backend/database/database.sqlite`

Key tables: `Administrators`, `Branches`, `Modules`, `Formateurs`, `Classrooms`, `Groups`, `GroupModuleFormateurs`, `Timetables`, `Sessions`, `FormateurTimetables`, `Merges`, `Tranings`, `Settings`

---

## Environment

### for developpement

`backend/.env`:

```env
NODE_ENV=development
PORT=8002
JWT_SECRET=your-secret-key
```

### for prduction use :

`backend/.env`:

```env
NODE_ENV=production
PORT=8002
JWT_SECRET=your-secret-key
```
Docs : [Decometation](https://elmahdijaouali.github.io/Timetable-Generator-ISTA/)
---

## Author

**ELMAHDI JAOUALI** — [@Elmahdijaouali](https://github.com/Elmahdijaouali)
