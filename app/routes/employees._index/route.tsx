import { useLoaderData } from "react-router"
import { getDB } from "~/db/getDB"

export async function loader() {
  const db = await getDB()
  const employees = await db.all("SELECT * FROM employees;")

  return { employees }
}

export default function EmployeesPage() {
  const { employees } = useLoaderData()
  return (
    <div>
      <div>
        {employees.map((employee: any) => (
          <div>
            <ul>
              <li>Employee #{employee.id}</li>
              <ul>
                <li>Full Name: {employee.full_name}</li>
              </ul>
            </ul>
          </div>
        ))}
      </div>
      <hr />
      <ul>
        <li><a href="/employees/new">New Employee</a></li>
        <li><a href="/timesheets/">Timesheets</a></li>
      </ul>
    </div>
  )
}
