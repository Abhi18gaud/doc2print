# QuickPrint Counter OS — Release Pipeline & Git Branching Guide

This document is your reference guide for releasing new versions of QuickPrint Counter OS, managing branches, and ensuring updates reach website visitors and installed desktop apps without friction.

---

## 1. Branch Strategy

| Branch | Purpose | Who Uses It |
| :--- | :--- | :--- |
| `main` / `staging` | **Staging & Active Testing** | Developers and internal testers. All features, UI changes, and fixes are merged here first for testing. |
| `production` | **Live Production Code** | Shop owners. Only stable, fully tested code is merged into `production`. |
| `feature/*` / `fix/*` | **Work in Progress** | Temporary branches for large features or bug fixes. |

```
feature/my-feature  ──┐
                      ▼
             main / staging (Daily testing & beta builds)
                      │
                      ▼ (Promote when verified)
                  production (Stable release)
                      │
                      ▼ (Create git tag vX.Y.Z)
             GitHub Actions CI/CD Pipeline
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
Website (Dynamic Download)   Desktop Auto-Updater
```

---

## 2. Release Commands Cheat Sheet

Run these from the project root:

| Command | What It Does | Example Version Change |
| :--- | :--- | :--- |
| `npm run release:patch` | Bug fixes, small patches | `2.4.0` → `2.4.1` |
| `npm run release:minor` | New features, major UI upgrades | `2.4.1` → `2.5.0` |
| `npm run release:major` | Breaking changes, architecture overhaul | `2.5.0` → `3.0.0` |
| `npm run release:beta` | Test builds for staging | `2.4.1-beta.1` |

> [!NOTE]
> Normal `npm run build` or `npm run dev` **never** bumps the version number. Version increments are strictly controlled by the dedicated release commands above.

---

## 3. Step-by-Step: How to Make a Production Release

### Step 1: Test on `main` (Staging)
Make sure your changes are tested locally:
```powershell
# 1. Start web app & test customer kiosk
npm run dev

# 2. Start desktop counter OS & test physical printing
cd desktop
npm start
```

### Step 2: Merge into `production`
Once everything is verified and stable:
```powershell
# Switch to production branch
git checkout production

# Pull latest and merge from main
git pull origin production
git merge main
```

### Step 3: Bump Version
Run the appropriate release command:
```powershell
# For bug fixes / small updates:
npm run release:patch

# Or for new features:
# npm run release:minor
```
This updates `desktop/package.json` and creates a local git tag (e.g. `v2.4.1`).

### Step 4: Push to GitHub
```powershell
# Push production branch and new release tag to GitHub
git push origin production --tags
```

---

## 4. What Happens Automatically After Pushing the Tag

1. **GitHub Actions Triggered**:
   The workflow at [`.github/workflows/release.yml`](.github/workflows/release.yml) runs on a Windows runner.
2. **Builds Windows Installer**:
   `electron-builder` builds `QuickPrint-Counter-OS-Setup-X.Y.Z.exe` and `latest.yml` (auto-update hash metadata).
3. **Publishes GitHub Release**:
   Creates official release **QuickPrint Counter OS vX.Y.Z** under `Abhi18gaud/doc2print/releases`.
4. **Website Updates Automatically**:
   - The marketing website (`/download` and `/`) calls `/api/releases/latest`.
   - The download button automatically serves the new version installer.
   - **Zero code changes needed on the website!**
5. **Existing Installed Desktop Software Updates**:
   - Existing installations detect the new release via `electron-updater`.
   - Shows an unobtrusive banner: *"QuickPrint Counter OS Update Available: vX.Y.Z"*.
   - User clicks **[Update Now]**.
   - Download progress is shown in real-time.
   - **Safe restart**: If the printer is actively printing (`Printer = PRINTING`), restart is automatically held until all active pages finish printing.
   - The update installs in-place. All shop credentials, UPI QR config, and printer routing remain **100% intact**.

---

## 5. Staging vs Production Channels

- **Normal Shop Owners (Default)**:
  - Settings → Software Updates → Channel: **Stable (Production)**
  - Only official releases like `2.4.1`, `2.4.2` are offered.
- **Internal Testers / Beta Program**:
  - Settings → Software Updates → Channel: **Beta (Staging / Testers)**
  - Receives preview builds like `2.4.1-beta.1` for advance hardware testing.

---

## 6. Safe Update During Printing (Print Protection Guard)

- The Counter OS maintains an `activePrintingJobsCount` monitor.
- If a shop manager clicks **[Restart & Install]** while documents are actively spooling:
  - Status changes to: `PRINTING: UPDATE HELD`.
  - Software displays: *"Update is available. It will be installed after current print jobs are completed."*
  - As soon as the Windows spooler queue empties, the app safely restarts and applies the update.

---

## 7. Offline Continuity

- If the counter PC loses internet or GitHub is momentarily unreachable:
  - Local counter printing, UPI payments, token queue, and hardware spooler **continue working normally**.
  - Update checking fails gracefully in the background without any blocking dialogs or errors.

---

## 8. Git Branches Quick Reference

```powershell
# Check current branch
git branch

# Switch to staging / main
git checkout main

# Switch to production
git checkout production

# See all remote branches
git branch -a
```
