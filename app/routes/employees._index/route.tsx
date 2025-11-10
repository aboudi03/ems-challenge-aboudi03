import { useLoaderData, useNavigate } from "react-router"
import { useState, useRef, useEffect } from "react"
import { getDB } from "~/db/getDB"

export async function loader({ request }: any) {
  const db = await getDB()
  // Get all departments for dynamic dropdown
  const departments = await db.all(`SELECT DISTINCT department FROM professions WHERE department IS NOT NULL AND department != '' ORDER BY department`)
  // Default sort: by id
  const url = new URL(request?.url || "http://localhost")
  const sortBy = url.searchParams.get("sortBy") || "id"
  const departmentFilter = url.searchParams.get("department") || null
  const activeFilter = url.searchParams.get("active") || "all"
  const searchQuery = url.searchParams.get("search") || ""
  let orderBy = "e.id"
  if (sortBy === "age") orderBy = "e.birth_date DESC"
  if (sortBy === "end_date") orderBy = "p.end_date DESC, e.id"
  if (sortBy === "department") orderBy = "p.department, e.id"

  let whereClause = []
  let params: any[] = []
  if (departmentFilter) {
    whereClause.push("p.department = ?")
    params.push(departmentFilter)
  }
  if (activeFilter === "active") {
    whereClause.push("(e.inactive IS NULL OR e.inactive = 0)")
  } else if (activeFilter === "inactive") {
    whereClause.push("e.inactive = 1")
  }
  if (searchQuery) {
    whereClause.push("(e.first_name LIKE ? OR e.last_name LIKE ?)")
    params.push(`%${searchQuery}%`, `%${searchQuery}%`)
  }
  const whereStr = whereClause.length ? `WHERE ${whereClause.join(' AND ')}` : ""

  const employees = await db.all(`
    SELECT 
      e.*,
      p.job_title,
      p.department,
      p.salary,
      p.start_date,
      p.end_date,
      cv.file_path as cv_path,
      cv.file_name as cv_file_name
    FROM employees e
    LEFT JOIN professions p ON e.id = p.employee_id
    LEFT JOIN employee_documents cv ON e.id = cv.employee_id AND cv.document_type = 'CV'
    ${whereStr}
    ORDER BY ${orderBy}
  `, params)

  return { employees, departments, sortBy, departmentFilter, activeFilter, searchQuery }
}

export default function EmployeesPage() {
  const { employees, departments, sortBy, departmentFilter, activeFilter, searchQuery } = useLoaderData()
  const navigate = useNavigate()
  const [selectedSort, setSelectedSort] = useState(sortBy)
  const [showDeptDropdown, setShowDeptDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [search, setSearch] = useState(searchQuery)
  const deptDropdownRef = useRef<HTMLUListElement>(null)
  const statusDropdownRef = useRef<HTMLUListElement>(null)
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current)
    }
  }, [])

  useEffect(() => {
    setSearch(searchQuery)
  }, [searchQuery])

  const handleDeptMouseEnter = () => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current)
    setShowDeptDropdown(true)
  }
  const handleDeptMouseLeave = () => {
    dropdownTimeout.current = setTimeout(() => {
      setShowDeptDropdown(false)
    }, 200)
  }
  const handleDropdownMouseEnter = () => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current)
    setShowDeptDropdown(true)
  }
  const handleDropdownMouseLeave = () => {
    dropdownTimeout.current = setTimeout(() => {
      setShowDeptDropdown(false)
    }, 200)
  }
  const handleStatusMouseEnter = () => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current)
    setShowStatusDropdown(true)
  }
  const handleStatusMouseLeave = () => {
    dropdownTimeout.current = setTimeout(() => {
      setShowStatusDropdown(false)
    }, 200)
  }
  const handleStatusDropdownMouseEnter = () => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current)
    setShowStatusDropdown(true)
  }
  const handleStatusDropdownMouseLeave = () => {
    dropdownTimeout.current = setTimeout(() => {
      setShowStatusDropdown(false)
    }, 200)
  }

  const handleSearchChange = (e: any) => {
    setSearch(e.target.value)
    navigate(`?search=${encodeURIComponent(e.target.value)}${departmentFilter ? `&department=${encodeURIComponent(departmentFilter)}` : ''}${activeFilter ? `&active=${encodeURIComponent(activeFilter)}` : ''}${sortBy ? `&sortBy=${encodeURIComponent(sortBy)}` : ''}`)
  }

  // Dynamic department options
  const departmentOptions = departments.map((d: any) => d.department)

  const handleSortChange = (e: any) => {
    setSelectedSort(e.target.value)
    navigate(`?sortBy=${e.target.value}`)
  }
  const handleDepartmentSelect = (dep: string) => {
    navigate(`?sortBy=department&department=${encodeURIComponent(dep)}`)
    setShowDeptDropdown(false)
  }
  const handleActiveFilter = (status: string) => {
    navigate(`?active=${status}${departmentFilter ? `&department=${encodeURIComponent(departmentFilter)}` : ''}${sortBy ? `&sortBy=${encodeURIComponent(sortBy)}` : ''}`)
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-light text-black mb-2 tracking-tight">
            Employees Directory
          </h1>
          <p className="text-gray-500 font-light">Manage your team members</p>
          <div className="mt-4 flex gap-4 items-center">
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by name..."
              className="px-4 py-2 border rounded-sm text-black bg-white w-64"
            />
            <label className="text-sm text-gray-700 font-medium">Sort by:</label>
            <div className="relative">
              <select
                value={selectedSort}
                onChange={handleSortChange}
                className="px-3 py-2 border rounded-sm text-black bg-white"
              >
                <option value="id">Default</option>
                <option value="age">Age</option>
                <option value="end_date">Contract End Date</option>
                <option value="department">Department</option>
                <option value="status">Status</option>
              </select>
              {/* Department dropdown on hover */}
              {selectedSort === 'department' && (
                <ul
                  ref={deptDropdownRef}
                  className="absolute left-0 top-full mt-2 w-48 bg-white border border-gray-300 rounded shadow-lg z-10"
                  onMouseEnter={handleDeptMouseEnter}
                  onMouseLeave={handleDeptMouseLeave}
                >
                  {departmentOptions.map((dep: string) => (
                    <li key={dep}>
                      <button
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${departmentFilter === dep ? 'font-bold text-blue-700' : 'text-black'}`}
                        onClick={() => handleDepartmentSelect(dep)}
                      >{dep}</button>
                    </li>
                  ))}
                </ul>
              )}
              {/* Status dropdown on hover */}
              {selectedSort === 'status' && (
                <ul
                  ref={statusDropdownRef}
                  className="absolute left-0 top-full mt-2 w-48 bg-white border border-gray-300 rounded shadow-lg z-10"
                  onMouseEnter={handleStatusDropdownMouseEnter}
                  onMouseLeave={handleStatusDropdownMouseLeave}
                >
                  <li>
                    <button
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${activeFilter === 'all' ? 'font-bold text-blue-700' : 'text-black'}`}
                      onClick={() => handleActiveFilter('all')}
                    >All</button>
                  </li>
                  <li>
                    <button
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${activeFilter === 'active' ? 'font-bold text-blue-700' : 'text-black'}`}
                      onClick={() => handleActiveFilter('active')}
                    >Active</button>
                  </li>
                  <li>
                    <button
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${activeFilter === 'inactive' ? 'font-bold text-blue-700' : 'text-black'}`}
                      onClick={() => handleActiveFilter('inactive')}
                    >Inactive</button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-sm p-12 text-center">
            <p className="text-gray-400 text-lg font-light">No employees found. Add your first employee!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {employees.map((employee: any) => {
              const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'N/A'
              const isInactive = employee.inactive === 1

              return (
                <div 
                  key={employee.id} 
                  className={`bg-white border ${isInactive ? 'border-red-400' : 'border-gray-300'} rounded-sm overflow-hidden transition-all duration-300 ease-in-out hover:border-black hover:shadow-lg relative cursor-pointer`}
                  onClick={() => { window.location.href = `/employees/${employee.id}` }}
                >
                  <div className="p-6">
                    {/* Header - Always visible */}
                    <div className="mb-4">
                      {/* Profile Photo */}
                      <div className="mb-4 flex justify-center">
                        {employee.photo_path ? (
                          <img
                            src={employee.photo_path}
                            alt={fullName}
                            className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                            onError={(e) => {
                              // Fallback if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              if (target.nextElementSibling) {
                                (target.nextElementSibling as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-24 h-24 rounded-full border-2 border-gray-300 bg-gray-100 flex items-center justify-center ${employee.photo_path ? 'hidden' : ''}`}
                        >
                          <svg
                            className="w-12 h-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                      </div>
                      
                      <h2 className="text-xl font-medium text-black mb-2 tracking-tight text-center">
                        {fullName}
                      </h2>
                      {employee.job_title && (
                        <p className="text-sm text-gray-700 font-normal mb-1 text-center">
                          {employee.job_title}
                        </p>
                      )}
                      {employee.department && (
                        <p className="text-xs text-gray-500 font-light uppercase tracking-wide text-center">
                          {employee.department}
                        </p>
                      )}
                    </div>

                    {/* Summary content shown on card */}
                    <div className="pt-2 border-t border-gray-200 space-y-3">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Personal Information</p>
                        <div className="space-y-2 text-sm">
                          {employee.email && (
                            <div className="flex items-start">
                              <span className="text-gray-600 font-light w-20">Email:</span>
                              <span className="text-black font-normal">{employee.email}</span>
                            </div>
                          )}
                          {employee.phone && (
                            <div className="flex items-start">
                              <span className="text-gray-600 font-light w-20">Phone:</span>
                              <span className="text-black font-normal">{employee.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Employee ID</p>
                        <span className="text-sm text-black font-normal">#{employee.id}</span>
                      </div>
                    </div>

                    {/* Bottom hint */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-black font-bold uppercase tracking-wider block mb-2">
                            View full profile
                          </span>
                          <span
                            className={`inline-block px-3 py-1 rounded-sm text-xs font-bold uppercase tracking-wider ${isInactive ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-300'}`}
                            style={{ minWidth: 80, textAlign: 'center' }}
                          >
                            {isInactive ? `Inactive${employee.inactivity_reason ? `: ${employee.inactivity_reason}` : ''}` : 'Active'}
                          </span>
                        </div>
                        <div>
                          <svg 
                            className="w-4 h-4 text-black" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="bg-white border border-gray-300 rounded-sm p-6">
          <div className="flex flex-wrap gap-4">
            <a 
              href="/employees/new" 
              className="px-6 py-3 bg-black text-white font-light rounded-sm hover:bg-gray-800 transition-all duration-200 border border-black uppercase tracking-wider text-sm"
            >
             Add New Employee
            </a>
            <a 
              href="/timesheets/" 
              className="px-6 py-3 bg-white text-black font-light rounded-sm hover:bg-gray-50 transition-all duration-200 border border-gray-300 uppercase tracking-wider text-sm"
            >
             View Timesheets
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
