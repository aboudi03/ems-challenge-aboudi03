import { useLoaderData, Form, useActionData, redirect, useNavigate } from "react-router"
import { getDB } from "~/db/getDB"
import { useState } from "react"

export const action = async ({ request, params }: any) => {
  const dbAction = await getDB()
  const employeeIdAction = params?.employeeId
  const formData = await request.formData()
  const actionType = formData.get("actionType")

  if (actionType === "edit") {
    // Edit employee info
    const first_name = formData.get("first_name")
    const last_name = formData.get("last_name")
    const birth_date = formData.get("birth_date")
    const email = formData.get("email")
    const phone = formData.get("phone")
    const address = formData.get("address")
    await dbAction.run(
      `UPDATE employees SET first_name = ?, last_name = ?, birth_date = ?, email = ?, phone = ?, address = ? WHERE id = ?`,
      [first_name, last_name, birth_date, email, phone, address, employeeIdAction]
    )
    return redirect(`/employees/${employeeIdAction}`)
  }
  if (actionType === "inactive") {
    // Set employee as inactive with reason
    const reason = formData.get("inactivity_reason") || ""
    await dbAction.run(`UPDATE employees SET inactive = 1, inactivity_reason = ? WHERE id = ?`, [reason, employeeIdAction])
    return redirect(`/employees`)
  }
  if (actionType === "editProfession") {
    // Edit professional info
    const job_title = formData.get("job_title")
    const department = formData.get("department")
    const salary = formData.get("salary")
    const start_date = formData.get("start_date")
    const end_date = formData.get("end_date")
    // Update latest profession row for employee
    await dbAction.run(
      `UPDATE professions SET job_title = ?, department = ?, salary = ?, start_date = ?, end_date = ? WHERE employee_id = ?`,
      [job_title, department, salary, start_date, end_date, employeeIdAction]
    )
    return redirect(`/employees/${employeeIdAction}`)
  }

  const employeeId = params?.employeeId
  const db = await getDB()

  if (!employeeId) {
    return { employee: null, profession: null, documents: [], reviews: [] }
  }

  const employee = await db.get(
    `SELECT e.* FROM employees e WHERE e.id = ?`,
    [employeeId]
  )

  const profession = await db.get(
    `SELECT * FROM professions WHERE employee_id = ? ORDER BY profession_id DESC LIMIT 1`,
    [employeeId]
  )

  const documents = await db.all(
    `SELECT document_type, file_path, file_name, uploaded_at FROM employee_documents WHERE employee_id = ? ORDER BY uploaded_at DESC`,
    [employeeId]
  )

  const reviews = await db.all(
    `SELECT * FROM performance_reviews WHERE employee_id = ? ORDER BY review_date DESC, created_at DESC`,
    [employeeId]
  )

  let metrics: any[] = []
  if (reviews.length > 0) {
    const ids = reviews.map((r: any) => r.review_id)
    const placeholders = ids.map(() => '?').join(',')
    metrics = await db.all(
      `SELECT * FROM review_metrics WHERE review_id IN (${placeholders}) ORDER BY metric_id ASC`,
      ids
    )
  }

  // Group metrics by review_id
  const metricsByReview: Record<string, any[]> = {}
  metrics.forEach((m: any) => {
    if (!metricsByReview[m.review_id]) metricsByReview[m.review_id] = []
    metricsByReview[m.review_id].push(m)
  })

  // Attach metrics to reviews
  const reviewsWithMetrics = reviews.map((r: any) => ({ ...r, metrics: metricsByReview[r.review_id] || [] }))

  return { employee, profession, documents, reviews: reviewsWithMetrics }
}

export async function loader({ params }: any) {
  const employeeId = params?.employeeId
  const db = await getDB()

  if (!employeeId) {
    return { employee: null, profession: null, documents: [], reviews: [] }
  }

  const employee = await db.get(
    `SELECT e.* FROM employees e WHERE e.id = ?`,
    [employeeId]
  )

  const profession = await db.get(
    `SELECT * FROM professions WHERE employee_id = ? ORDER BY profession_id DESC LIMIT 1`,
    [employeeId]
  )

  const documents = await db.all(
    `SELECT document_type, file_path, file_name, uploaded_at FROM employee_documents WHERE employee_id = ? ORDER BY uploaded_at DESC`,
    [employeeId]
  )

  const reviews = await db.all(
    `SELECT * FROM performance_reviews WHERE employee_id = ? ORDER BY review_date DESC, created_at DESC`,
    [employeeId]
  )

  let metrics: any[] = []
  if (reviews.length > 0) {
    const ids = reviews.map((r: any) => r.review_id)
    const placeholders = ids.map(() => '?').join(',')
    metrics = await db.all(
      `SELECT * FROM review_metrics WHERE review_id IN (${placeholders}) ORDER BY metric_id ASC`,
      ids
    )
  }

  // Group metrics by review_id
  const metricsByReview: Record<string, any[]> = {}
  metrics.forEach((m: any) => {
    if (!metricsByReview[m.review_id]) metricsByReview[m.review_id] = []
    metricsByReview[m.review_id].push(m)
  })

  // Attach metrics to reviews
  const reviewsWithMetrics = reviews.map((r: any) => ({ ...r, metrics: metricsByReview[r.review_id] || [] }))

  return { employee, profession, documents, reviews: reviewsWithMetrics }
}

export default function EmployeePage() {
  const { employee, profession, documents, reviews } = useLoaderData() as any
  const actionData = useActionData() as any
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editValues, setEditValues] = useState({
    first_name: employee?.first_name || "",
    last_name: employee?.last_name || "",
    birth_date: employee?.birth_date || "",
    email: employee?.email || "",
    phone: employee?.phone || "",
    address: employee?.address || ""
  })
  const [metrics, setMetrics] = useState([
    { key: "Productivity", rating: "", comment: "" }
  ])
  const [showInactiveForm, setShowInactiveForm] = useState(false)
  const [inactivityReason, setInactivityReason] = useState("")
  const [editProfessionMode, setEditProfessionMode] = useState(false)
  const [professionValues, setProfessionValues] = useState({
    job_title: profession?.job_title || "",
    department: profession?.department || "",
    salary: profession?.salary || "",
    start_date: profession?.start_date || "",
    end_date: profession?.end_date || ""
  })
  const inactivityOptions = ["Resigned", "Terminated", "On Leave", "Retired"]
  const metricOptions = [
    "Productivity", "Quality of Work", "Efficiency", "Goal Achievement", "Consistency",
    "Communication", "Teamwork", "Adaptability", "Problem-solving", "Leadership",
    "Attendance", "Punctuality", "Leave Record",
    "Training Participation", "Skill Improvement", "Certifications",
    "Customer/Peer Feedback", "Goal Tracking"
  ]

  const addMetric = () => {
    setMetrics([...metrics, { key: "Productivity", rating: "", comment: "" }])
  }
  const updateMetric = (idx: number, field: string, value: string) => {
    setMetrics(metrics.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }
  const removeMetric = (idx: number) => {
    setMetrics(metrics.filter((_, i) => i !== idx))
  }
  const handleEditChange = (e: any) => {
    setEditValues({ ...editValues, [e.target.name]: e.target.value })
  }
  const handleProfessionChange = (e: any) => {
    setProfessionValues({ ...professionValues, [e.target.name]: e.target.value })
  }

  // Animation classes for expanding/collapsing
  const formPanelClass = `transition-all duration-500 ease-in-out ${showForm ? 'max-h-[1200px] opacity-100 scale-100' : 'max-h-0 opacity-0 scale-95 overflow-hidden'} ${!showForm ? 'animate-fadeOut' : 'animate-fadeIn'}`

  const fullName = `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || 'N/A'

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.95); } }
        .animate-fadeIn { animation: fadeIn 0.5s forwards; }
        .animate-fadeOut { animation: fadeOut 0.5s forwards; }
      `}</style>
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 flex items-start gap-8">
            <div className="w-40 flex-shrink-0">
              {employee.photo_path ? (
                <img src={employee.photo_path} alt={fullName} className="w-40 h-40 rounded-md object-cover border" />
              ) : (
                <div className="w-40 h-40 rounded-md bg-gray-100 border flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-medium text-black">{fullName}</h1>
                  <p className="text-sm text-gray-600 mt-1">{profession?.job_title || '—'}{profession?.department ? ` • ${profession.department}` : ''}</p>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mt-2">Employee ID: #{employee.id}</p>
                </div>
                <div className="text-right">
                  {profession?.salary && (
                    <div className="text-sm text-black font-normal">${Number(profession.salary).toLocaleString()}</div>
                  )}
                  <div className="text-xs text-gray-500">{profession?.start_date ? `Started: ${profession.start_date}` : ''}</div>
                  {profession?.end_date && (
                    <div className="text-xs text-gray-500">{`Ended: ${profession.end_date}`}</div>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-sm p-4">
                  <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Contact & Personal</h3>
                  <div className="text-sm space-y-2">
                    {employee.email && <div><span className="text-gray-600">Email: </span><a className="text-black underline" href={`mailto:${employee.email}`}>{employee.email}</a></div>}
                    {employee.phone && <div><span className="text-gray-600">Phone: </span><span>{employee.phone}</span></div>}
                    {employee.birth_date && <div><span className="text-gray-600">Birth Date: </span><span>{employee.birth_date}</span></div>}
                    {employee.address && <div><span className="text-gray-600">Address: </span><span>{employee.address}</span></div>}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-sm p-4">
                  <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Documents</h3>
                  <div className="text-sm space-y-2">
                    {documents.length === 0 && <div className="text-gray-500">No uploaded documents</div>}
                    {documents.map((d: any) => (
                      <div key={d.file_path}>
                        <a href={d.file_path} target="_blank" rel="noopener noreferrer" className="text-black underline">{d.document_type}: {d.file_name}</a>
                        <div className="text-xs text-gray-400">Uploaded: {d.uploaded_at}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Professional Details */}
              <div className="mt-6 bg-white border border-gray-200 rounded-sm p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs text-gray-400 uppercase tracking-wider">Professional Details</h3>
                  <button
                    className="px-3 py-1 bg-gray-100 text-black rounded-sm border border-gray-300 text-xs font-light"
                    onClick={() => setEditProfessionMode((v) => !v)}
                  >
                    {editProfessionMode ? "Cancel Edit" : "Edit"}
                  </button>
                </div>
                {editProfessionMode ? (
                  <Form method="post" className="space-y-2">
                    <input type="hidden" name="actionType" value="editProfession" />
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Job Title</label>
                      <input name="job_title" type="text" value={professionValues.job_title} onChange={handleProfessionChange} className="w-full border px-3 py-2 rounded-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Department</label>
                      <input name="department" type="text" value={professionValues.department} onChange={handleProfessionChange} className="w-full border px-3 py-2 rounded-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Salary</label>
                      <input name="salary" type="number" value={professionValues.salary} onChange={handleProfessionChange} className="w-full border px-3 py-2 rounded-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                      <input name="start_date" type="date" value={professionValues.start_date} onChange={handleProfessionChange} className="w-full border px-3 py-2 rounded-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">End Date</label>
                      <input name="end_date" type="date" value={professionValues.end_date} onChange={handleProfessionChange} className="w-full border px-3 py-2 rounded-sm" />
                    </div>
                    <button type="submit" className="mt-2 px-4 py-2 bg-black text-white rounded-sm text-xs font-light">Save Changes</button>
                  </Form>
                ) : (
                  <div className="text-sm space-y-2">
                    {profession?.job_title && <div><span className="text-gray-600">Job Title: </span><span>{profession.job_title}</span></div>}
                    {profession?.department && <div><span className="text-gray-600">Department: </span><span>{profession.department}</span></div>}
                    {profession?.salary && <div><span className="text-gray-600">Salary: </span><span>${Number(profession.salary).toLocaleString()}</span></div>}
                    {profession?.start_date && <div><span className="text-gray-600">Start Date: </span><span>{profession.start_date}</span></div>}
                    {profession?.end_date && <div><span className="text-gray-600">End Date: </span><span>{profession.end_date}</span></div>}
                  </div>
                )}
              </div>

              {/* Performance Reviews */}
              <div className="mt-8">
                <h2 className="text-xl font-medium mb-3">Performance Reviews</h2>

                <button
                  className={`mb-4 px-4 py-2 rounded-sm text-sm font-light transition-all duration-300 ${showForm ? 'bg-gray-200 text-black' : 'bg-black text-white'}`}
                  onClick={() => setShowForm((v) => !v)}
                  style={{ boxShadow: showForm ? '0 2px 8px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.16)' }}
                >
                  {showForm ? "Cancel" : "Add Review"}
                </button>

                <div className={formPanelClass}>
                  {showForm && (
                    <Form method="post" className="mb-8 bg-white border border-black rounded-lg p-8 shadow-lg space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Reviewer Name</label>
                          <input name="reviewer_name" type="text" className="w-full border px-3 py-2 rounded-md" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Review Date</label>
                          <input name="review_date" type="date" required className="w-full border px-3 py-2 rounded-md" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Overall Rating <span className="text-gray-400">/10</span></label>
                        <input name="overall_rating" type="number" min="1" max="10" className="w-32 border px-3 py-2 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Overall Comments</label>
                        <textarea name="overall_comments" className="w-full border px-3 py-2 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Metrics</label>
                        <div className="space-y-2">
                          {metrics.map((metric, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <select
                                name="metric_key"
                                value={metric.key}
                                onChange={e => updateMetric(idx, "key", e.target.value)}
                                className="w-48 border px-2 py-1 rounded-md bg-gray-50"
                                required
                              >
                                {metricOptions.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                              <input
                                name="metric_rating"
                                type="number"
                                min="1"
                                max="10"
                                value={metric.rating}
                                onChange={e => updateMetric(idx, "rating", e.target.value)}
                                className="w-20 border px-2 py-1 rounded-md"
                                placeholder="Rating /10"
                                required
                              />
                              <input
                                name="metric_comment"
                                type="text"
                                value={metric.comment}
                                onChange={e => updateMetric(idx, "comment", e.target.value)}
                                className="flex-1 border px-2 py-1 rounded-md"
                                placeholder="Comment"
                              />
                              <button type="button" className="text-xs text-red-500 ml-2" onClick={() => removeMetric(idx)}>
                                Remove
                              </button>
                            </div>
                          ))}
                          <button type="button" className="mt-2 px-2 py-1 bg-gray-200 text-black rounded-md text-xs" onClick={addMetric}>
                            Add Metric
                          </button>
                        </div>
                      </div>
                      <button type="submit" className="mt-4 px-4 py-2 bg-black text-white rounded-md text-sm font-light shadow">Submit Review</button>
                      {actionData?.error && <div className="text-red-500 text-sm mt-2">{actionData.error}</div>}
                    </Form>
                  )}
                </div>

                <div className="space-y-4 mt-8">
                  {(!reviews || reviews.length === 0) ? (
                    <div className="bg-white border border-gray-200 rounded-sm p-6 text-center text-gray-500">No performance reviews yet.</div>
                  ) : (
                    reviews.map((review: any) => (
                      <div key={review.review_id} className="bg-white border border-gray-200 rounded-lg p-6 shadow">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-base font-semibold text-black">{review.reviewer_name || 'Reviewer'}</div>
                            <div className="text-xs text-gray-500">Review date: {review.review_date}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-bold text-black">Overall Rating: <span className="text-blue-600">{review.overall_rating ?? '—'}/10</span></div>
                            {review.overall_comments && <div className="text-xs text-gray-600 mt-1">{review.overall_comments}</div>}
                          </div>
                        </div>
                        <div className="mt-4 border-t pt-4">
                          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Tracked Metrics</div>
                          {review.metrics.length === 0 ? (
                            <div className="text-sm text-gray-500">No detailed metrics recorded.</div>
                          ) : (
                            <div className="space-y-2">
                              {Object.entries(review.metrics.reduce((acc: any, m: any) => {
                                acc[m.metric_key] = acc[m.metric_key] || []
                                acc[m.metric_key].push(m)
                                return acc
                              }, {})).map(([metricKey, entries]: any[]) => (
                                <div key={metricKey} className="p-2 bg-gray-50 border border-gray-100 rounded-md">
                                  <div className="text-sm font-medium">{metricKey}</div>
                                  <ul className="list-disc list-inside space-y-1">
                                    {entries.map((e: any) => (
                                      <li key={e.metric_id} className="text-sm text-gray-700">
                                        <span className="font-medium">Rating:</span> <span className="text-blue-600">{e.rating ?? '—'}/10</span>
                                        {e.comment && <div className="text-xs text-gray-600 mt-1">Comment: {e.comment}</div>}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  className="px-6 py-3 bg-black text-white font-light rounded-sm hover:bg-gray-800 transition-all duration-200 border border-black uppercase tracking-wider text-sm"
                  onClick={() => navigate('/employees')}
                >
                  Back to Employees
                </button>
                <button
                  className="px-6 py-3 bg-gray-100 text-black font-light rounded-sm border border-gray-300 uppercase tracking-wider text-sm"
                  onClick={() => setEditMode((v) => !v)}
                >
                  {editMode ? "Cancel Edit" : "Edit"}
                </button>
                <button
                  className="px-6 py-3 bg-red-600 text-white font-light rounded-sm border border-red-700 uppercase tracking-wider text-sm ml-2"
                  onClick={() => setShowInactiveForm((v) => !v)}
                >
                  {showInactiveForm ? "Cancel" : "Set Inactive"}
                </button>
              </div>

              {/* Edit form */}
              {editMode && (
                <Form method="post" className="mt-6 bg-white border border-black rounded-lg p-8 shadow-lg space-y-6">
                  <input type="hidden" name="actionType" value="edit" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">First Name</label>
                      <input name="first_name" type="text" value={editValues.first_name} onChange={handleEditChange} className="w-full border px-3 py-2 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Last Name</label>
                      <input name="last_name" type="text" value={editValues.last_name} onChange={handleEditChange} className="w-full border px-3 py-2 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Birth Date</label>
                      <input name="birth_date" type="date" value={editValues.birth_date} onChange={handleEditChange} className="w-full border px-3 py-2 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Email</label>
                      <input name="email" type="email" value={editValues.email} onChange={handleEditChange} className="w-full border px-3 py-2 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Phone</label>
                      <input name="phone" type="text" value={editValues.phone} onChange={handleEditChange} className="w-full border px-3 py-2 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Address</label>
                      <input name="address" type="text" value={editValues.address} onChange={handleEditChange} className="w-full border px-3 py-2 rounded-md" />
                    </div>
                  </div>
                  <button type="submit" className="mt-4 px-4 py-2 bg-black text-white rounded-md text-sm font-light shadow">Save Changes</button>
                </Form>
              )}

              {/* Inactivity reason form */}
              {showInactiveForm && (
                <Form method="post" className="mt-6 bg-white border border-red-700 rounded-lg p-8 shadow-lg space-y-6">
                  <input type="hidden" name="actionType" value="inactive" />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Set Inactivity Reason</label>
                    <select
                      name="inactivity_reason"
                      value={inactivityReason}
                      onChange={e => setInactivityReason(e.target.value)}
                      className="w-full border px-3 py-2 rounded-md"
                      required
                    >
                      <option value="">Select reason...</option>
                      {inactivityOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-light shadow">Confirm Inactive</button>
                </Form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
