PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    phone TEXT NOT NULL,
    blood TEXT NOT NULL,
    address TEXT NOT NULL,
    symptoms TEXT NOT NULL,
    conditions TEXT NOT NULL,
    allergies TEXT NOT NULL,
    department TEXT NOT NULL,
    priority TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    visit_date TEXT NOT NULL,
    doctor_id TEXT,
    queue_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    department TEXT NOT NULL,
    timing TEXT NOT NULL,
    available INTEGER NOT NULL,
    workload INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    total INTEGER NOT NULL,
    occupied INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS allocations (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS histories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    event_date TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patient_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patient_department ON patients(department);
CREATE INDEX IF NOT EXISTS idx_appointment_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_history_patient ON histories(patient_id);
