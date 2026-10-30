"""Flask backend for the Intelligent Patient Record Management System.

This is a college demonstration that stores fictional records in SQLite.
It is not intended for real clinical use or medical diagnosis.
"""

from pathlib import Path
import csv
from datetime import date
import json
import sqlite3

from flask import Flask, jsonify, render_template, request


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "database" / "hospital.db"
SCHEMA_PATH = BASE_DIR / "database" / "schema.sql"

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False


def connect_database():
    """Return a SQLite connection whose rows behave like dictionaries."""
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database():
    """Create the database tables the first time the project runs."""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect_database() as connection:
        connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        patient_count = connection.execute("SELECT COUNT(*) FROM patients").fetchone()[0]
    if patient_count == 0:
        replace_state(default_database_state())


def rows_as_dicts(connection, query):
    return [dict(row) for row in connection.execute(query).fetchall()]


def default_database_state():
    """Build the first-run database from the included fictional CSV records."""
    symptom_examples = {
        "Cardiology": "Chest discomfort and shortness of breath",
        "Neurology": "Recurring headache and dizziness",
        "Orthopedics": "Joint pain after physical activity",
        "Pediatrics": "Fever and cough",
        "Dermatology": "Skin irritation and itching",
        "General Medicine": "Weakness and fatigue",
    }
    department_doctors = {
        "Cardiology":"D101", "Neurology":"D102", "Orthopedics":"D103",
        "General Medicine":"D104", "Pediatrics":"D105", "Dermatology":"D106",
    }
    patients = []
    csv_path = BASE_DIR / "database" / "sample_patients.csv"
    with csv_path.open(encoding="utf-8", newline="") as stream:
        for row in csv.DictReader(stream):
            patients.append({
                "id": row["Patient_ID"], "name": row["Name"], "age": int(row["Age"]),
                "gender": row["Gender"], "phone": row["Phone"], "blood": row["Blood_Group"],
                "address": "Delhi NCR", "symptoms": symptom_examples[row["Department"]],
                "conditions": "None reported", "allergies": "None reported",
                "department": row["Department"], "priority": row["Priority"],
                "riskScore": int(row["Risk_Score"]), "visitDate": date.today().isoformat(),
                "doctorId": department_doctors[row["Department"]],
                "queueStatus": "Waiting" if row["Priority"] in {"Critical", "High", "Medium"} else "Normal",
            })

    doctors = [
        {"id":"D101","name":"Dr. Rohan Sharma","specialty":"Cardiologist","department":"Cardiology","timing":"09:00-14:00","available":True,"workload":2},
        {"id":"D102","name":"Dr. Nisha Rao","specialty":"Neurologist","department":"Neurology","timing":"10:00-16:00","available":True,"workload":1},
        {"id":"D103","name":"Dr. Vikram Sethi","specialty":"Orthopedic Surgeon","department":"Orthopedics","timing":"09:30-15:30","available":False,"workload":2},
        {"id":"D104","name":"Dr. Priya Nair","specialty":"General Physician","department":"General Medicine","timing":"08:00-14:00","available":True,"workload":1},
        {"id":"D105","name":"Dr. Amit Khanna","specialty":"Pediatrician","department":"Pediatrics","timing":"11:00-17:00","available":True,"workload":1},
        {"id":"D106","name":"Dr. Sara Qureshi","specialty":"Dermatologist","department":"Dermatology","timing":"10:00-15:00","available":True,"workload":1},
    ]
    resources = [
        {"id":"R1","name":"General beds","code":"BED","total":80,"occupied":57},
        {"id":"R2","name":"ICU beds","code":"ICU","total":18,"occupied":14},
        {"id":"R3","name":"Ventilators","code":"VEN","total":12,"occupied":8},
        {"id":"R4","name":"Operation rooms","code":"OT","total":7,"occupied":4},
        {"id":"R5","name":"Diagnostic units","code":"DX","total":15,"occupied":9},
        {"id":"R6","name":"Wheelchairs","code":"WC","total":25,"occupied":11},
    ]
    appointments = [
        {"id":f"A20{index+1}","patientId":patient["id"],"doctorId":patient["doctorId"],
         "date":date.today().isoformat(),"time":f"{9+index:02d}:00","status":"Scheduled"}
        for index, patient in enumerate(patients[:4])
    ]
    histories = {patient["id"]:[{"date":date.today().isoformat(),"title":"Patient registered","detail":"Initial fictional record created for the academic demonstration."}] for patient in patients}
    return {
        "departments":["Cardiology","Neurology","Orthopedics","General Medicine","Pediatrics","Dermatology"],
        "patients":patients, "doctors":doctors, "appointments":appointments,
        "resources":resources, "allocations":[], "histories":histories,
        "indexKeys":[patient["id"] for patient in patients],
    }


def read_state():
    """Read all website data from SQLite and return one JSON-ready object."""
    with connect_database() as connection:
        patients = rows_as_dicts(connection, "SELECT * FROM patients ORDER BY id")
        doctors = rows_as_dicts(connection, "SELECT * FROM doctors ORDER BY id")
        appointments = rows_as_dicts(connection, "SELECT * FROM appointments ORDER BY date, time")
        resources = rows_as_dicts(connection, "SELECT * FROM resources ORDER BY id")
        allocations = rows_as_dicts(connection, "SELECT * FROM allocations ORDER BY id")
        history_rows = rows_as_dicts(connection, "SELECT * FROM histories ORDER BY event_date DESC, id DESC")
        settings = {row["key"]: row["value"] for row in connection.execute("SELECT key, value FROM settings")}

    for patient in patients:
        patient["riskScore"] = patient.pop("risk_score")
        patient["visitDate"] = patient.pop("visit_date")
        patient["doctorId"] = patient.pop("doctor_id") or ""
        patient["queueStatus"] = patient.pop("queue_status")
    for doctor in doctors:
        doctor["available"] = bool(doctor["available"])
    for appointment in appointments:
        appointment["patientId"] = appointment.pop("patient_id")
        appointment["doctorId"] = appointment.pop("doctor_id")
    for allocation in allocations:
        allocation["resourceId"] = allocation.pop("resource_id")
        allocation["patientId"] = allocation.pop("patient_id")

    histories = {}
    for item in history_rows:
        histories.setdefault(item["patient_id"], []).append({
            "date": item["event_date"], "title": item["title"], "detail": item["detail"]
        })

    return {
        "departments": json.loads(settings.get("departments", "[]")),
        "patients": patients,
        "doctors": doctors,
        "appointments": appointments,
        "resources": resources,
        "allocations": allocations,
        "histories": histories,
        "indexKeys": json.loads(settings.get("index_keys", "[]")),
    }


def replace_state(data):
    """Save the current demonstration state inside one safe transaction."""
    required = {"patients", "doctors", "appointments", "resources", "allocations"}
    if not required.issubset(data):
        raise ValueError("The submitted state is incomplete.")

    with connect_database() as connection:
        for table in ("histories", "allocations", "appointments", "patients", "doctors", "resources", "settings"):
            connection.execute(f"DELETE FROM {table}")

        connection.executemany(
            """INSERT INTO patients VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [(p["id"], p["name"], p["age"], p["gender"], p["phone"], p["blood"], p["address"],
              p["symptoms"], p.get("conditions", "None reported"), p.get("allergies", "None reported"),
              p["department"], p["priority"], p.get("riskScore", 30), p["visitDate"],
              p.get("doctorId") or None, p.get("queueStatus", "Normal")) for p in data["patients"]]
        )
        connection.executemany(
            "INSERT INTO doctors VALUES (?, ?, ?, ?, ?, ?, ?)",
            [(d["id"], d["name"], d["specialty"], d["department"], d["timing"],
              int(d.get("available", True)), d.get("workload", 0)) for d in data["doctors"]]
        )
        connection.executemany(
            "INSERT INTO appointments VALUES (?, ?, ?, ?, ?, ?)",
            [(a["id"], a["patientId"], a["doctorId"], a["date"], a["time"], a["status"])
             for a in data["appointments"]]
        )
        connection.executemany(
            "INSERT INTO resources VALUES (?, ?, ?, ?, ?)",
            [(r["id"], r["name"], r["code"], r["total"], r["occupied"]) for r in data["resources"]]
        )
        connection.executemany(
            "INSERT INTO allocations VALUES (?, ?, ?, ?, ?, ?)",
            [(a["id"], a["resourceId"], a["patientId"], a.get("quantity", 1), a["time"], a["status"])
             for a in data["allocations"]]
        )

        history_values = []
        for patient_id, items in data.get("histories", {}).items():
            history_values.extend((patient_id, item["date"], item["title"], item["detail"]) for item in items)
        connection.executemany(
            "INSERT INTO histories(patient_id, event_date, title, detail) VALUES (?, ?, ?, ?)", history_values
        )
        connection.executemany(
            "INSERT INTO settings(key, value) VALUES (?, ?)",
            [("departments", json.dumps(data.get("departments", []))),
             ("index_keys", json.dumps(data.get("indexKeys", [])))]
        )


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/api/state")
def get_state():
    return jsonify(read_state())


@app.post("/api/state")
def save_state():
    try:
        replace_state(request.get_json(force=True))
        return jsonify({"saved": True})
    except (ValueError, KeyError, TypeError) as error:
        return jsonify({"saved": False, "error": str(error)}), 400


@app.get("/health")
def health():
    return jsonify({"status": "ok", "database": DATABASE_PATH.name})


initialize_database()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
