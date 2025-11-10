import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbConfigPath = path.join(__dirname, '../database.yaml');
const dbConfig = yaml.load(fs.readFileSync(dbConfigPath, 'utf8'));

const {
  'sqlite_path': sqlitePath,
} = dbConfig;

const db = new sqlite3.Database(sqlitePath);

const employees = [
  { first_name: 'John', last_name: 'Doe',birth_date: '1995-01-01', email: 'john@example.com', phone: '123456789', address: '123 Main St' },
  { first_name: 'Jane', last_name: 'Smith',birth_date: '1989-01-01', email: 'jane@example.com', phone: '987654321', address: '456 Elm St' },
  { first_name: 'Alice', last_name: 'Johnson',birth_date: '1995-01-01', email: 'alice@example.com', phone: '555111222', address: '789 Oak Ave' },
];

const professions = [
  { employee_id: 1, job_title: 'Web Developer', department: 'Engineering', salary: 100000, start_date: '2025-05-12', end_date: null },
  { employee_id: 2, job_title: 'Software Engineer', department: 'Engineering', salary: 200000, start_date: '2025-06-01', end_date: null },
  { employee_id: 3, job_title: 'Mobile Developer', department: 'Engineering', salary: 300000, start_date: '2025-07-04', end_date: null },
];

const timesheets = [
  {
    employee_id: 1,
    work_date: '2025-02-10',
    start_time: '2025-02-10 08:00:00',
    end_time: '2025-02-10 17:00:00',
    hours_worked: 9,
    notes: 'Regular shift',
    status: 'Submitted'
  },
  {
    employee_id: 2,
    work_date: '2025-02-11',
    start_time: '2025-02-11 12:00:00',
    end_time: '2025-02-11 17:00:00',
    hours_worked: 5,
    notes: 'Half day',
    status: 'Submitted'
  },
  {
    employee_id: 3,
    work_date: '2025-02-12',
    start_time: '2025-02-12 07:00:00',
    end_time: '2025-02-12 16:00:00',
    hours_worked: 9,
    notes: 'Morning shift',
    status: 'Submitted'
  },
];


const insertData = (table, data) => {
  const columns = Object.keys(data[0]).join(', ');
  const placeholders = Object.keys(data[0]).map(() => '?').join(', ');

  const insertStmt = db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`);

  data.forEach(row => {
    insertStmt.run(Object.values(row));
  });

  insertStmt.finalize();
};

db.serialize(() => {
  insertData('employees', employees);
  insertData('professions', professions);
  insertData('timesheets', timesheets);
});

db.close(err => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Database seeded successfully.');
  }
});

