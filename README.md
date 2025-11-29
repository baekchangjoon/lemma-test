# Jira Test Management Forge App

This Forge app provides test management capabilities within Jira, including custom issue types (`Testcase`, `TestSet`, `TestRun`), custom link types, and strict link validation rules.

## Features

- **Custom Issue Types**: Automatically creates `Testcase`, `TestSet`, and `TestRun`.
- **Custom Link Types**: Automatically creates `Test Association`, `Test Inclusion`, and `Test Execution`.
- **Link Validation**: Enforces strict linking rules (e.g., `TestRun` cannot link directly to `Testcase`).

---

## 🛠 Debugging Guide

When debugging Forge apps, especially those with setup triggers, standard `forge tunnel` might not catch installation events. We use a **WebTrigger** to manually invoke setup logic.

### Prerequisites
1.  **VS Code** with Forge extension (optional but recommended).
2.  **Forge CLI** installed and logged in.

### Steps
1.  **Start Tunnel with Debugging**:
    ```bash
    forge tunnel --debug --debugFunctionHandlers index.validateLink --debugStartingPort 9229
    ```
    *   `--debug`: Enables the inspector.
    *   `--debugFunctionHandlers`: Specifies which functions to debug.
    *   `--debugStartingPort`: Sets the debugger port (default 9229).

2.  **Manually Trigger Setup (WebTrigger)**:
    Since `avi:jira:installed:app` only fires once per install, use the WebTrigger to run `setup.js` on demand:
    ```bash
    forge webtrigger --functionKey manual-setup-trigger
    ```
    *   This will execute the `setup` function and hit any `debugger;` breakpoints you've set in VS Code.

3.  **Debug Link Validation**:
    *   Create a link in Jira (e.g., link a `TestRun` to a `Testcase`).
    *   The `avi:jira:created:issuelink` trigger will fire.
    *   The `validateLink` function will execute, and you can step through it in the debugger.

---

## ⚠️ Troubleshooting: Missing Issue Types/Links

If you installed the app but don't see `Testcase`, `TestSet`, etc., in your **Company-managed project**, follow these steps:

1.  **Check Global Issue Types**:
    *   Go to **Jira Settings (Cog icon) > Issues > Issue types**.
    *   Verify that `Testcase`, `TestSet`, `TestRun` exist.

2.  **Add to Project Issue Type Scheme**:
    *   Go to **Project settings > Issue types**.
    *   Click **Actions > Edit issue types**.
    *   Drag the missing types from **Available Issue Types** to **Issue Types for Current Scheme**.
    *   Click **Save**.

3.  **Check Issue Link Types**:
    *   Go to **Jira Settings > Issues > Issue linking**.
    *   Verify `Test Association`, `Test Inclusion`, `Test Execution` exist.

---

## 🏢 Team-managed Projects Support

**Team-managed projects** do not inherit global issue types created by the app. You must manually configure them.

### How to use in Team-managed Projects
1.  **Create Issue Types Manually**:
    *   Go to **Project settings > Issue types**.
    *   Click **Add issue type**.
    *   Create `Testcase`, `TestSet`, and `TestRun` exactly with these names. (The app matches by name).

2.  **Link Validation**:
    *   Once the issue types are created with the correct names, the app's link validator will automatically work for them, as it checks the string name of the issue type.

**Recommendation**: For a robust test management environment, we strongly recommend using **Company-managed projects**.

---

## 📥 Bulk Import (CSV)

You can bulk create Testcases and Links using Jira's native CSV Import.

### 1. Prepare CSV File
Create a CSV file with columns for `Summary`, `Issue Type`, and Link columns.

**Example CSV:**
```csv
Summary,Issue Type,Link "Test Inclusion",Link "Test Execution"
Login Test,Testcase,,
Signup Test,Testcase,,
Core Features Set,TestSet,Login Test,
Release 1.0 Run,TestRun,,Core Features Set
```

*   **Link Columns**: The header must be `Link "<Link Type Name>"`.
*   **Values**: Put the **Summary** (exact match) or **Issue Key** of the target issue.

### 2. Import to Jira
1.  Go to **Issues** (top menu) > **Import issues from CSV**.
2.  Upload your CSV file.
3.  **Map Fields**:
    *   Map `Summary` to `Summary`.
    *   Map `Issue Type` to `Issue Type`.
    *   Map `Link "Test Inclusion"` to `Link "Test Inclusion"`.
4.  **Run Import**.

Jira will create the issues and automatically link them according to your CSV. The app's validator will still run in the background, so if you try to import invalid links (e.g., TestRun -> Testcase), they will be deleted and flagged.
