# Windows Native Build Guide

This guide describes how to build the Timetable Generator project natively on a Windows machine. Building natively on Windows avoids common cross-compilation issues with native modules like `sqlite3`.

## 1. Prerequisites

Before you begin, ensure you have the following installed on your Windows machine:

1.  **Node.js (LTS)**: Download and install from [nodejs.org](https://nodejs.org/).
2.  **Git**: Download and install from [git-scm.com](https://git-scm.com/).
3.  **Build Tools for Visual Studio**:
    - This is **REQUIRED** for compiling `sqlite3` and other native modules.
    - Download the [Visual Studio Installer](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022).
    - Select **"Desktop development with C++"** during installation.
    - Alternatively, you can run `npm install --global windows-build-tools` from an **Administrator** PowerShell, though the VS Installer method is more reliable.


    

## 2. Setup

1.  **Clone the Repository**:

    ```bash
    git clone https://github.com/Elmahdijaouali/Timetable-Generator-ISTA.git
    cd Timetable-Generator-ISTA
    ```

2.  **Install Root Dependencies**:

    ```bash
    npm install
    ```

3.  **Install & Setup Backend**:

    ```bash
    cd backend
    npm install
    # Copy .env-example to .env
    copy .env-example .env
    ```

4.  **Rebuild Native Modules**:
    From the `backend` directory, run:
    ```bash
    npm run rebuild:win
    ```

## 3. Building the Application

Go back to the root directory and run the Windows build command:

```bash
cd ..
npm run build:win
```

The installer will be generated in the `dist` folder.

## Troubleshooting

### "Cannot find module 'sqlite3'"

If you encounter this error at runtime, ensure you have run `npm run rebuild:win` in the `backend` directory. This ensures the SQLite binary is compatible with the Electron version you are using.

### Node-Gyp errors

If you see errors related to `node-gyp` during `npm install`, it usually means the C++ Build Tools or Python are missing. Ensure "Desktop development with C++" is installed via the Visual Studio Installer.
