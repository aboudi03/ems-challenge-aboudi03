import { useLoaderData, Form, redirect } from "react-router";
import { getDB } from "~/db/getDB";

export async function loader() {
  const db = await getDB();
  const employees = await db.all('SELECT id, first_name, last_name FROM employees WHERE inactive IS NULL OR inactive = 0');
  return { employees };
}

import type { ActionFunction } from "react-router";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const employee_id = formData.get("employee_id");
  const work_date = formData.get("work_date");
  const start_time_raw = formData.get("start_time");
  const end_time_raw = formData.get("end_time");
  const hours_worked = formData.get("hours_worked");
  const notes = formData.get("notes");
  const status = formData.get("status") || "Submitted";

  // Combine date and time into full datetime strings
  const start_time = work_date && start_time_raw ? `${work_date} ${start_time_raw}` : null;
  const end_time = work_date && end_time_raw ? `${work_date} ${end_time_raw}` : null;

  const db = await getDB();
  await db.run(
    'INSERT INTO timesheets (employee_id, work_date, start_time, end_time, hours_worked, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [employee_id, work_date, start_time, end_time, hours_worked, notes, status]
  );

  return redirect("/timesheets");
}

export default function NewTimesheetPage() {
  const { employees } = useLoaderData();
  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded shadow">
      <h1 className="text-2xl font-bold mb-6">Create New Timesheet</h1>
      <Form method="post" className="space-y-4">
        <div>
          <label htmlFor="employee_id" className="block text-sm font-medium mb-1">Employee</label>
          <select name="employee_id" id="employee_id" required className="w-full border px-3 py-2 rounded">
            <option value="">Select employee...</option>
            {employees.map((e: any) => (
              <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="work_date" className="block text-sm font-medium mb-1">Work Date</label>
          <input type="date" name="work_date" id="work_date" required className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label htmlFor="start_time" className="block text-sm font-medium mb-1">Start Time</label>
          <input type="time" name="start_time" id="start_time" required className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label htmlFor="end_time" className="block text-sm font-medium mb-1">End Time</label>
          <input type="time" name="end_time" id="end_time" required className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label htmlFor="hours_worked" className="block text-sm font-medium mb-1">Hours Worked</label>
          <input type="number" step="0.01" name="hours_worked" id="hours_worked" required className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1">Notes</label>
          <textarea name="notes" id="notes" className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
          <select name="status" id="status" className="w-full border px-3 py-2 rounded">
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <button type="submit" className="w-full py-3 bg-black text-white rounded font-bold">Create Timesheet</button>
      </Form>
      <hr className="my-8" />
      <ul className="flex gap-4">
        <li><a href="/timesheets" className="text-blue-600 underline">Timesheets</a></li>
        <li><a href="/employees" className="text-blue-600 underline">Employees</a></li>
      </ul>
    </div>
  );
}
