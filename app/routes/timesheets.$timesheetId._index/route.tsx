import type { ActionFunction } from "react-router";

export const action: ActionFunction = async ({ request, params }) => {
  const formData = await request.formData();
  const work_date = formData.get("work_date");
  const start_time_raw = formData.get("start_time");
  const end_time_raw = formData.get("end_time");
  const hours_worked = formData.get("hours_worked");
  const notes = formData.get("notes");
  const status = formData.get("status") || "Submitted";

  // Combine date and time into full datetime strings
  const start_time = work_date && start_time_raw ? `${work_date} ${start_time_raw}` : null;
  const end_time = work_date && end_time_raw ? `${work_date} ${end_time_raw}` : null;

  // Validation: end time must be after start time
  if (start_time && end_time) {
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    if (endDate <= startDate) {
      return {
        error: "End time must be after start time."
      };
    }
  }
  // Validation: hours_worked must not be negative
  if (hours_worked && Number(hours_worked) < 0) {
    return {
      error: "Hours worked cannot be negative."
    };
  }

  const db = await getDB();
  await db.run(
    'UPDATE timesheets SET work_date = ?, start_time = ?, end_time = ?, hours_worked = ?, notes = ?, status = ? WHERE id = ?',
    [work_date, start_time, end_time, hours_worked, notes, status, params.timesheetId]
  );
  return redirect("/timesheets");
};
import { Form, redirect, useLoaderData } from "react-router";
import { getDB } from "~/db/getDB";
export async function loader() {
  const db = await getDB();
  // get timesheetId from params
  // params is passed as the first argument
  // For React Router loaders: loader({ params })
  // If not, fallback to undefined
  let timesheetId;
  if (typeof arguments[0] === 'object' && arguments[0]?.params?.timesheetId) {
    timesheetId = arguments[0].params.timesheetId;
  }
  const timesheet = await db.get("SELECT * FROM timesheets WHERE id = ?", timesheetId);
  return { timesheet };
}

export default function TimesheetPage() {
  const { timesheet, error } = useLoaderData();
  // Extract time part for form fields
  const startTime = timesheet.start_time?.split(" ")[1] || "";
  const endTime = timesheet.end_time?.split(" ")[1] || "";
  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      <div className="max-w-xl mx-auto bg-white p-8 rounded shadow">
        <h1 className="text-2xl font-bold mb-6">Edit Timesheet #{timesheet.id}</h1>
        <Form method="post" className="space-y-4">
          <div>
            <label htmlFor="work_date" className="block text-sm font-medium mb-1">Work Date</label>
            <input type="date" name="work_date" id="work_date" required className="w-full border px-3 py-2 rounded" defaultValue={timesheet.work_date} />
          </div>
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium mb-1">Start Time</label>
            <input type="time" name="start_time" id="start_time" required className="w-full border px-3 py-2 rounded" defaultValue={startTime} />
          </div>
          <div>
            <label htmlFor="end_time" className="block text-sm font-medium mb-1">End Time</label>
            <input type="time" name="end_time" id="end_time" required className="w-full border px-3 py-2 rounded" defaultValue={endTime} />
          </div>
          <div>
            <label htmlFor="hours_worked" className="block text-sm font-medium mb-1">Hours Worked</label>
            <input type="number" step="0.01" name="hours_worked" id="hours_worked" required className="w-full border px-3 py-2 rounded" defaultValue={timesheet.hours_worked} />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-1">Notes</label>
            <textarea name="notes" id="notes" className="w-full border px-3 py-2 rounded" defaultValue={timesheet.notes} />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
            <select name="status" id="status" className="w-full border px-3 py-2 rounded" defaultValue={timesheet.status}>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <button type="submit" className="w-full py-3 bg-black text-white rounded font-bold">Save Changes</button>
        </Form>
        <hr className="my-8" />
        <ul className="flex gap-4">
          <li><a href="/timesheets" className="text-blue-600 underline">Timesheets</a></li>
          <li><a href="/timesheets/new" className="text-blue-600 underline">New Timesheet</a></li>
          <li><a href="/employees" className="text-blue-600 underline">Employees</a></li>
        </ul>
      </div>
    </div>
  );
}
