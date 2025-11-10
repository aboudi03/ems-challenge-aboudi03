import { Form, redirect, type ActionFunction, useActionData, useSubmit } from "react-router";
import { useState, useEffect } from "react";
import { getDB } from "~/db/getDB";
import { validateEmployeeForm, getFieldError, type ValidationError, validateCompliance, type ComplianceIssue, validateRequired, validateEmail, validatePhone, validateDate, validateDateRange, validateSalary } from "~/utils/validation";
import { saveUploadedFile, ensureUploadDirs } from "~/utils/fileUpload";

export const action: ActionFunction = async ({ request }) => {
  ensureUploadDirs();
  const formData = await request.formData();
  
  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  const birth_date = formData.get("birth_date") as string || null;
  const email = formData.get("email") as string || null;
  const phone_country_code = formData.get("phone_country_code") as string || "+961";
  const phone_number = formData.get("phone_number") as string || null;
  const phone = phone_number ? `${phone_country_code}${phone_number}` : null;
  const address = formData.get("address") as string || null;
  
  const job_title = formData.get("job_title") as string || null;
  const department = formData.get("department") as string || null;
  const salary = formData.get("salary") as string || null;
  const start_date = formData.get("start_date") as string || null;
  const end_date = formData.get("end_date") as string || null;

  // Validate form data
  const validation = validateEmployeeForm({
    first_name,
    last_name,
    email,
    phone: phone_number, // Validate only the phone number part (without country code)
    birth_date,
    start_date,
    end_date,
    salary,
  });

  if (!validation.isValid) {
    return {
      errors: validation.errors,
      values: {
        first_name,
        last_name,
        email,
        phone: phone_number,
        phone_country_code: phone_country_code,
        address,
        birth_date,
        job_title,
        department,
        salary,
        start_date,
        end_date,
      },
    };
  }

  const db = await getDB();
  
  // Insert employee first
  const result = await db.run(
    'INSERT INTO employees (first_name, last_name, birth_date, email, phone, address, photo_path) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [first_name, last_name, birth_date, email, phone, address, null]
  );

  const employeeId = result.lastID;

  if (!employeeId) {
    return {
      errors: [{ field: 'general', message: 'Failed to create employee' }],
      values: {
        first_name,
        last_name,
        email,
        phone: phone_number,
        phone_country_code: phone_country_code,
        address,
        birth_date,
        job_title,
        department,
        salary,
        start_date,
        end_date,
      },
    };
  }

  // Handle photo upload
  const photoFile = formData.get("photo") as File | null;
  let photoPath: string | null = null;
  if (photoFile && photoFile.size > 0) {
    try {
      photoPath = await saveUploadedFile(photoFile, 'photos', employeeId);
      await db.run('UPDATE employees SET photo_path = ? WHERE id = ?', [photoPath, employeeId]);
    } catch (error) {
      console.error('Error saving photo:', error);
    }
  }

  // Handle document uploads
  const idFile = formData.get("id_document") as File | null;
  if (idFile && idFile.size > 0) {
    try {
      const idPath = await saveUploadedFile(idFile, 'documents', employeeId);
      await db.run(
        'INSERT INTO employee_documents (employee_id, document_type, file_path, file_name) VALUES (?, ?, ?, ?)',
        [employeeId, 'ID', idPath, idFile.name]
      );
    } catch (error) {
      console.error('Error saving ID document:', error);
    }
  }

  const cvFile = formData.get("cv_document") as File | null;
  if (cvFile && cvFile.size > 0) {
    try {
      const cvPath = await saveUploadedFile(cvFile, 'documents', employeeId);
      await db.run(
        'INSERT INTO employee_documents (employee_id, document_type, file_path, file_name) VALUES (?, ?, ?, ?)',
        [employeeId, 'CV', cvPath, cvFile.name]
      );
    } catch (error) {
      console.error('Error saving CV document:', error);
    }
  }

  // Insert profession
  if (job_title && employeeId) {
    await db.run(
      'INSERT INTO professions (employee_id, job_title, department, salary, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
      [employeeId, job_title, department, salary ? parseFloat(salary) : null, start_date, end_date]
    );
  }

  return redirect("/employees");
};

export default function NewEmployeePage() {
  const actionData = useActionData<{
    errors?: ValidationError[];
    values?: Record<string, string | null>;
  }>();

  const errors = actionData?.errors || [];
  const values = actionData?.values || {};
  const submit = useSubmit();

  // State for all form fields
  const [firstName, setFirstName] = useState<string>(values.first_name || "");
  const [lastName, setLastName] = useState<string>(values.last_name || "");
  const [email, setEmail] = useState<string>(values.email || "");
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>(values.phone_country_code || "+961");
  const [phoneNumber, setPhoneNumber] = useState<string>(values.phone || "");
  const [address, setAddress] = useState<string>(values.address || "");
  const [birthDate, setBirthDate] = useState<string>(values.birth_date || "");
  const [jobTitle, setJobTitle] = useState<string>(values.job_title || "");
  const [department, setDepartment] = useState<string>(values.department || "");
  const [salary, setSalary] = useState<string>(values.salary || "");
  const [startDate, setStartDate] = useState<string>(values.start_date || "");
  const [endDate, setEndDate] = useState<string>(values.end_date || "");
  
  // State for file inputs and compliance
  const [hasIdDocument, setHasIdDocument] = useState<boolean>(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);

  // Client-side validation errors
  const [clientErrors, setClientErrors] = useState<ValidationError[]>([]);

  // Dynamic compliance checking
  const complianceResult = validateCompliance({
    birth_date: birthDate || null,
    salary: salary || null,
    hasIdDocument: hasIdDocument || idFile !== null,
    minimumWage: 600,
  });

  // Update compliance when files change
  useEffect(() => {
    setHasIdDocument(idFile !== null);
  }, [idFile]);

  // Client-side validation function
  const validateForm = (): boolean => {
    const validation = validateEmployeeForm({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phoneNumber || null,
      birth_date: birthDate || null,
      start_date: startDate || null,
      end_date: endDate || null,
      salary: salary || null,
    });

    setClientErrors(validation.errors);
    return validation.isValid;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = document.querySelector('[data-error="true"]');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Create form data and submit
    const formData = new FormData(e.currentTarget);
    submit(formData, { method: 'post', encType: 'multipart/form-data' });
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-light text-black mb-2 tracking-tight">
            Add New Employee
          </h1>
          <p className="text-gray-500 font-light">Create a new employee record</p>
        </div>

        {/* Compliance Status Panel */}
        {!complianceResult.isCompliant && (
          <div className="mb-6 bg-white border border-gray-400 rounded-sm p-6">
            <h3 className="text-sm font-medium text-black mb-4 uppercase tracking-wider">Warning</h3>
            <div className="space-y-4">
              {complianceResult.issues
                .filter((issue) => !issue.isCompliant)
                .map((issue: ComplianceIssue, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-100 border border-gray-300 rounded-sm p-3 relative">
                        <div className="absolute -top-1.5 left-4 w-3 h-3 bg-gray-100 border-l border-t border-gray-300 transform rotate-45"></div>
                        <p className="text-xs text-black font-medium mb-1 uppercase tracking-wider">
                          {issue.type === 'age' && 'Age Compliance'}
                          {issue.type === 'salary' && 'Minimum Wage Compliance'}
                          {issue.type === 'id' && 'ID Document Required'}
                        </p>
                        <p className="text-xs text-gray-700 font-normal">{issue.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Display general errors if any */}
        {(errors.length > 0 || clientErrors.length > 0) && (
          <div className="mb-6 bg-white border border-gray-400 rounded-sm p-4">
            <p className="text-sm text-black font-medium mb-2 uppercase tracking-wider">Please fix the following errors:</p>
            <ul className="list-disc list-inside space-y-1">
              {[...errors, ...clientErrors].map((error, index) => (
                <li key={index} className="text-sm text-gray-700">{error.message}</li>
              ))}
            </ul>
          </div>
        )}

        <Form method="post" encType="multipart/form-data" className="space-y-8" onSubmit={handleSubmit}>
          {/* Personal Information Section */}
          <div className="bg-white border border-gray-300 rounded-sm p-8">
            <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-6 font-light">
              Personal Information
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="first_name" className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-light">
                    First Name <span className="text-gray-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    id="first_name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    data-error={getFieldError("First Name", [...errors, ...clientErrors]) ? "true" : "false"}
                    className={`w-full px-4 py-3 border rounded-sm bg-white text-black font-normal focus:outline-none focus:border-black transition-all duration-200 ${
                      getFieldError("First Name", [...errors, ...clientErrors]) ? "border-gray-500" : "border-gray-300"
                    }`}
                  />
                  {getFieldError("First Name", [...errors, ...clientErrors]) && (
                    <p className="mt-1 text-xs text-gray-600">{getFieldError("First Name", [...errors, ...clientErrors])}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-light">
                    Last Name <span className="text-gray-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    id="last_name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    data-error={getFieldError("Last Name", [...errors, ...clientErrors]) ? "true" : "false"}
                    className={`w-full px-4 py-3 border rounded-sm bg-white text-black font-normal focus:outline-none focus:border-black transition-all duration-200 ${
                      getFieldError("Last Name", [...errors, ...clientErrors]) ? "border-gray-500" : "border-gray-300"
                    }`}
                  />
                  {getFieldError("Last Name", [...errors, ...clientErrors]) && (
                    <p className="mt-1 text-xs text-gray-600">{getFieldError("Last Name", [...errors, ...clientErrors])}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-light">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-error={getFieldError("email", [...errors, ...clientErrors]) ? "true" : "false"}
                  className={`w-full px-4 py-3 border rounded-sm bg-white text-black font-normal focus:outline-none focus:border-black transition-all duration-200 ${
                    getFieldError("email", [...errors, ...clientErrors]) ? "border-gray-500" : "border-gray-300"
                  }`}
                />
                {getFieldError("email", [...errors, ...clientErrors]) && (
                  <p className="mt-1 text-xs text-gray-600">{getFieldError("email", [...errors, ...clientErrors])}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-light">
                  Phone
                </label>
                <div className="flex gap-2">
                  <select
                    name="phone_country_code"
                    id="phone_country_code"
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="w-48 px-4 py-3 border border-gray-300 rounded-sm bg-white text-black font-normal focus:outline-none focus:border-black transition-all duration-200"
                  >
                    <option value="+961">+961 (Lebanon)</option>
                    <option value="+1">+1 (US/Canada)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+33">+33 (France)</option>
                    <option value="+49">+49 (Germany)</option>
                    <option value="+971">+971 (UAE)</option>
                    <option value="+966">+966 (Saudi Arabia)</option>
                    <option value="+20">+20 (Egypt)</option>
                    <option value="+212">+212 (Morocco)</option>
                    <option value="+962">+962 (Jordan)</option>
                    <option value="+963">+963 (Syria)</option>
                    <option value="+974">+974 (Qatar)</option>
                    <option value="+965">+965 (Kuwait)</option>
                    <option value="+973">+973 (Bahrain)</option>
                    <option value="+968">+968 (Oman)</option>
                  </select>
                  <input
                    type="tel"
                    name="phone_number"
                    id="phone_number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="78902345"
                    data-error={getFieldError("phone", [...errors, ...clientErrors]) ? "true" : "false"}
                    className={`flex-1 px-4 py-3 border rounded-sm bg-white text-black font-normal focus:outline-none focus:border-black transition-all duration-200 ${
                      getFieldError("phone", [...errors, ...clientErrors]) ? "border-gray-500" : "border-gray-300"
                    }`}
                  />
                </div>
                {getFieldError("phone", [...errors, ...clientErrors]) && (
                  <p className="mt-1 text-xs text-gray-600">{getFieldError("phone", [...errors, ...clientErrors])}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Enter at least 8 digits</p>
              </div>

              <div>
                <label htmlFor="address" className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-light">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm bg-white text-black font-normal focus:outline-none focus:border-black transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="birth_date" className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-light">
                  Birth Date
                </label>
                <input
                  type="date"
                  name="birth_date"
                  id="birth_date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  data-error={getFieldError("Birth Date", [...errors, ...clientErrors]) ? "true" : "false"}
                  className={`w-full px-4 py-3 border rounded-sm bg-white text-black font-normal focus:outline-none focus:border-black transition-all duration-200 ${
                    getFieldError("Birth Date", [...errors, ...clientErrors]) ? "border-gray-500" : "border-gray-300"
                  }`}
                />
                {getFieldError("Birth Date", [...errors, ...clientErrors]) && (
                  <p className="mt-1 text-xs text-gray-600">{getFieldError("Birth Date", [...errors, ...clientErrors])}</p>
                )}
              </div>

              {/* Photo Upload */}
              <div>
                <label htmlFor="photo" className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-light">
                  Employee Photo
                </label>
                <input
                  type="file"
                  name="photo"
                  id="photo"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm bg-white text-black font-normal focus:outline-none focus:border-black transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-light file:bg-black file:text-white file:cursor-pointer hover:file:bg-gray-800"
                />
                {photoFile && (
                  <p className="mt-2 text-xs text-gray-500">Selected: {photoFile.name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="bg-white border border-gray-300 rounded-sm p-8">
            <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-6 font-light">
              Documents
            </h2>
            <div className="space-y-6">
              <div>
                <label htmlFor="id_document" className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-light">
                  ID Document <span className="text-gray-400">*</span>
                </label>
                <input
                  type="file"
                  name="id_document"
                  id="id_document"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm bg-white text-black font-normal focus:outline-none focus:border-black transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-light file:bg-black file:text-white file:cursor-pointer hover:file:bg-gray-800"
                />
                {idFile && (
                  <p className="mt-2 text-xs text-gray-500">Selected: {idFile.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="cv_document" className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-light">
                  CV / Resume
                </label>
                <input
                  type="file"
                  name="cv_document"
                  id="cv_document"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm bg-white text-black font-normal focus:outline-none focus:border-black transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-light file:bg-black file:text-white file:cursor-pointer hover:file:bg-gray-800"
                />
                {cvFile && (
                  <p className="mt-2 text-xs text-gray-500">Selected: {cvFile.name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Professional Information Section */}
          <div className="bg-white border border-gray-300 rounded-sm p-8">
            <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-6 font-light">
              Professional Information
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="job_title" className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-light">
                    Job Title
                  </label>
                  <input
                    type="text"
                    name="job_title"
                    id="job_title"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-sm bg-white text-black font-normal focus:outline-none focus:border-black transition-all duration-200"
                  />
                </div>
                <div>
                  <label htmlFor="department" className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-light">
                    Department
                  </label>
                  <input
                    type="text"
                    name="department"
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-sm bg-white text-black font-normal focus:outline-none focus:border-black transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="salary" className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-light">
                  Salary
                </label>
                <input
                  type="number"
                  name="salary"
                  id="salary"
                  step="50"
                  min="600"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  data-error={getFieldError("salary", [...errors, ...clientErrors]) ? "true" : "false"}
                  className={`w-full px-4 py-3 border rounded-sm bg-white text-black font-normal focus:outline-none focus:border-black transition-all duration-200 ${
                    getFieldError("salary", [...errors, ...clientErrors]) ? "border-gray-500" : "border-gray-300"
                  }`}
                />
                {getFieldError("salary", [...errors, ...clientErrors]) && (
                  <p className="mt-1 text-xs text-gray-600">{getFieldError("salary", [...errors, ...clientErrors])}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="start_date" className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-light">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    id="start_date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-error={getFieldError("Start Date", [...errors, ...clientErrors]) ? "true" : "false"}
                    className={`w-full px-4 py-3 border rounded-sm bg-white text-black font-normal focus:outline-none focus:border-black transition-all duration-200 ${
                      getFieldError("Start Date", [...errors, ...clientErrors]) ? "border-gray-500" : "border-gray-300"
                    }`}
                  />
                  {getFieldError("Start Date", [...errors, ...clientErrors]) && (
                    <p className="mt-1 text-xs text-gray-600">{getFieldError("Start Date", [...errors, ...clientErrors])}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="end_date" className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-light">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    id="end_date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-error={getFieldError("End Date", [...errors, ...clientErrors]) ? "true" : "false"}
                    className={`w-full px-4 py-3 border rounded-sm bg-white text-black font-normal focus:outline-none focus:border-black transition-all duration-200 ${
                      getFieldError("End Date", [...errors, ...clientErrors]) ? "border-gray-500" : "border-gray-300"
                    }`}
                  />
                  {getFieldError("End Date", [...errors, ...clientErrors]) && (
                    <p className="mt-1 text-xs text-gray-600">{getFieldError("End Date", [...errors, ...clientErrors])}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white border border-gray-300 rounded-sm p-6">
            <div className="flex flex-wrap gap-4">
              <button
                type="submit"
                className="px-6 py-3 bg-black text-white font-light rounded-sm hover:bg-gray-800 transition-all duration-200 border border-black uppercase tracking-wider text-sm"
              >
                Create Employee
              </button>
              <a
                href="/employees"
                className="px-6 py-3 bg-white text-black font-light rounded-sm hover:bg-gray-50 transition-all duration-200 border border-gray-300 uppercase tracking-wider text-sm"
              >
                Cancel
              </a>
            </div>
          </div>
        </Form>

        {/* Navigation */}
        <div className="mt-8 bg-white border border-gray-300 rounded-sm p-6">
          <div className="flex flex-wrap gap-4">
            <a
              href="/employees"
              className="px-6 py-3 bg-white text-black font-light rounded-sm hover:bg-gray-50 transition-all duration-200 border border-gray-300 uppercase tracking-wider text-sm"
            >
              View Employees
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
  );
}
