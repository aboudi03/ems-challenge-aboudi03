-- This file contains the SQL schema, it drops all tables and recreates them

DROP TABLE IF EXISTS employee_documents;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS timesheets;
DROP TABLE IF EXISTS professions;
DROP TABLE IF EXISTS performance_reviews;
DROP TABLE IF EXISTS review_metrics;

-- To add a field to a table do
-- CREATE TABLE table_name (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     nullable_field TEXT,
--     non_nullable_field TEXT NOT NULL,
--     numeric_field INTEGER,
--     unique_field TEXT UNIQUE,
--     unique_non_nullable_field TEXT NOT NULL UNIQUE,
--     date_field DATE,
--     datetime_field DATETIME
-- );

-- Create employees table
CREATE TABLE employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NULL,
    last_name TEXT NULL,
    birth_date DATE NULL,
    email TEXT NULL,
    phone TEXT NULL,
    address TEXT NULL,
    photo_path TEXT NULL,
    inactive INTEGER DEFAULT 0,
    inactivity_reason TEXT
);

CREATE TABLE professions (
    profession_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    job_title TEXT NOT NULL,
    department TEXT,
    salary REAL,
    start_date DATE NULL,
    end_date DATE NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE employee_documents (
    document_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    document_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);


-- Create timesheets table
CREATE TABLE timesheets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    work_date DATE NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    hours_worked REAL,
    notes TEXT,
    status TEXT DEFAULT 'Submitted',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- New tables for performance reviews and metrics
CREATE TABLE performance_reviews (
    review_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    reviewer_name TEXT NULL,
    review_date DATE NOT NULL,
    overall_rating INTEGER NULL,
    overall_comments TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE review_metrics (
    metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL,
    metric_key TEXT NOT NULL,
    rating INTEGER NULL,
    comment TEXT NULL,
    FOREIGN KEY (review_id) REFERENCES performance_reviews(review_id)
);
