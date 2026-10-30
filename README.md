# Intelligent Patient Record Management System

This repository contains two versions of the same academic project:

- `flask_app/` - the complete local version with Flask and SQLite.
- `dist/` - a browser-only demonstration that stores changes in local storage.

The website uses fictional data. Its care assessment is a transparent classroom demonstration, not a medical diagnosis tool.

## Main features

- Three demo roles: Admin, Doctor and Receptionist
- Hospital overview with live summary cards and charts
- Patient registration, search, update, deletion and full profile
- Explainable symptom-based priority and department suggestion
- Heap-style emergency priority queue
- Smart doctor recommendation based on specialty, availability and workload
- Appointment booking with conflict prevention
- Patient-doctor-department relationship map and referral path
- Hospital resource management and optimisation demonstration
- B+ style patient index with exact and range search
- Performance lab for AVL tree, heap, graph, dynamic programming, scheduling and indexing
- SQLite persistence in the local Flask version

## Run on Windows

1. Install Python 3.11 or newer from python.org. During installation, select **Add Python to PATH**.
2. Open the `flask_app` folder.
3. Double-click `run_project.bat`.
4. Wait until the terminal displays `Running on http://127.0.0.1:5000`.
5. Open `http://127.0.0.1:5000` in Chrome.

If double-clicking does not work, open Command Prompt inside `flask_app` and run:

```bash
python -m pip install -r requirements.txt
python app.py
```

## Demo accounts

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Doctor | `doctor` | `doctor123` |
| Receptionist | `reception` | `reception123` |

## Important folders

```text
flask_app/
├── app.py                  Flask server and SQLite operations
├── requirements.txt        Required Python package
├── run_project.bat         One-click Windows launcher
├── algorithms/             DSA implementations
├── database/schema.sql     Database design
├── static/assets/          CSS, JavaScript and sample data
└── templates/index.html    Website interface
```

## How the database starts

On the first run, `app.py` creates `database/hospital.db`. The website then stores the included fictional sample records in it. Later changes are saved automatically.

To return to completely fresh sample data, close the server and delete only `flask_app/database/hospital.db`. The next run creates it again.

## Short demonstration order

1. Log in as Receptionist.
2. Register one fictional patient.
3. Open Care Assessment and apply the result.
4. Show the updated Emergency Queue.
5. Use Assign on the Patient Records page.
6. Book an appointment and demonstrate timing-conflict prevention.
7. Open the Relationship Map.
8. Allocate and release a resource.
9. Search a Patient ID in Patient Index.
10. Finish with Run All Demonstrations in Performance Lab.

## Responsible project use

Before submission, replace the student-information placeholders in `docs/STUDENT_CUSTOMIZATION.md`, practise the demonstration, and make changes you understand. Follow your institution's AI-use and citation rules honestly.
