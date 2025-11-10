/**
 * Validation utilities for form fields
 * Provides reusable validation functions for employee and timesheet forms
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates if a value is not empty (for required fields)
 */
export function validateRequired(value: string | null | undefined, fieldName: string): ValidationError | null {
  if (!value || value.trim() === '') {
    return {
      field: fieldName,
      message: `${fieldName} is required`,
    };
  }
  return null;
}

/**
 * Validates email format
 */
export function validateEmail(email: string | null | undefined): ValidationError | null {
  if (!email || email.trim() === '') {
    return null; // Email is optional
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      field: 'email',
      message: 'Invalid email format',
    };
  }
  return null;
}

/**
 * Validates phone number format
 * Validates phone number part (after country code) has minimum 8 digits
 */
export function validatePhone(phoneNumber: string | null | undefined, countryCode: string | null | undefined = null): ValidationError | null {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return null; // Phone is optional
  }

  // Remove common phone number characters (spaces, hyphens, parentheses)
  const cleanedPhone = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
  
  // Check if it contains only digits and has at least 8 digits
  const phoneRegex = /^\d{8,}$/;
  if (!phoneRegex.test(cleanedPhone)) {
    return {
      field: 'phone',
      message: 'Invalid phone number format. Phone number must contain at least 8 digits',
    };
  }
  return null;
}

/**
 * Validates date format and ensures it's a valid date
 */
export function validateDate(date: string | null | undefined, fieldName: string): ValidationError | null {
  if (!date || date.trim() === '') {
    return null; // Date is optional unless specified as required
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return {
      field: fieldName,
      message: `Invalid ${fieldName} format`,
    };
  }
  return null;
}

/**
 * Validates that end date is after start date
 */
export function validateDateRange(startDate: string | null | undefined, endDate: string | null | undefined): ValidationError | null {
  if (!startDate || !endDate) {
    return null; // Both dates must be provided for range validation
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) {
    return {
      field: 'End Date',
      message: 'End date must be after start date',
    };
  }
  return null;
}

/**
 * Validates salary is a positive number and meets minimum requirement
 */
export function validateSalary(salary: string | null | undefined, minSalary: number = 0): ValidationError | null {
  if (!salary || salary.trim() === '') {
    return null; // Salary is optional
  }

  const salaryNum = parseFloat(salary);
  if (isNaN(salaryNum)) {
    return {
      field: 'salary',
      message: 'Salary must be a valid number',
    };
  }

  if (salaryNum < minSalary) {
    return {
      field: 'salary',
      message: `Salary must be at least ${minSalary}`,
    };
  }

  return null;
}

/**
 * Validates employee form data
 */
export function validateEmployeeForm(data: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  salary?: string | null;
}): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  const firstNameError = validateRequired(data.first_name, 'First Name');
  if (firstNameError) errors.push(firstNameError);

  const lastNameError = validateRequired(data.last_name, 'Last Name');
  if (lastNameError) errors.push(lastNameError);

  // Optional but validated fields
  const emailError = validateEmail(data.email);
  if (emailError) errors.push(emailError);

  const phoneError = validatePhone(data.phone);
  if (phoneError) errors.push(phoneError);

  const birthDateError = validateDate(data.birth_date, 'Birth Date');
  if (birthDateError) errors.push(birthDateError);

  const startDateError = validateDate(data.start_date, 'Start Date');
  if (startDateError) errors.push(startDateError);

  const endDateError = validateDate(data.end_date, 'End Date');
  if (endDateError) errors.push(endDateError);

  // Date range validation
  const dateRangeError = validateDateRange(data.start_date, data.end_date);
  if (dateRangeError) errors.push(dateRangeError);

  // Salary validation (minimum $600 based on minimum wage requirement)
  const salaryError = validateSalary(data.salary, 600);
  if (salaryError) errors.push(salaryError);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Gets error message for a specific field
 */
export function getFieldError(fieldName: string, errors: ValidationError[]): string | undefined {
  const error = errors.find((e) => e.field === fieldName);
  return error?.message;
}

/**
 * Compliance validation interfaces
 */
export interface ComplianceIssue {
  type: 'age' | 'salary' | 'id';
  message: string;
  isCompliant: boolean;
}

export interface ComplianceResult {
  isCompliant: boolean;
  issues: ComplianceIssue[];
}

/**
 * Validates if employee is over 18 years old
 */
export function validateAge(birthDate: string | null | undefined): ComplianceIssue {
  if (!birthDate) {
    return {
      type: 'age',
      message: 'Birth date is required to verify age compliance',
      isCompliant: false,
    };
  }

  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  const dayDiff = today.getDate() - birth.getDate();

  // Calculate exact age
  let exactAge = age;
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    exactAge--;
  }

  if (exactAge < 18) {
    return {
      type: 'age',
      message: `Employee is ${exactAge} years old. Must be at least 18 years old.`,
      isCompliant: false,
    };
  }

  return {
    type: 'age',
    message: `Employee is ${exactAge} years old (compliant)`,
    isCompliant: true,
  };
}

/**
 * Validates if salary meets minimum wage requirement
 */
export function validateMinimumWage(salary: string | null | undefined, minimumWage: number = 600): ComplianceIssue {
  if (!salary || salary.trim() === '') {
    return {
      type: 'salary',
      message: 'Salary is required to verify minimum wage compliance',
      isCompliant: false,
    };
  }

  const salaryNum = parseFloat(salary);
  if (isNaN(salaryNum)) {
    return {
      type: 'salary',
      message: 'Invalid salary value',
      isCompliant: false,
    };
  }

  if (salaryNum < minimumWage) {
    return {
      type: 'salary',
      message: `Salary is $${salaryNum.toLocaleString()}. Minimum wage is $${minimumWage.toLocaleString()}.`,
      isCompliant: false,
    };
  }

  return {
    type: 'salary',
    message: `Salary is $${salaryNum.toLocaleString()} (compliant)`,
    isCompliant: true,
  };
}

/**
 * Validates if ID document is uploaded
 */
export function validateIdUpload(hasIdDocument: boolean): ComplianceIssue {
  if (!hasIdDocument) {
    return {
      type: 'id',
      message: 'ID document is required for compliance',
      isCompliant: false,
    };
  }

  return {
    type: 'id',
    message: 'ID document uploaded (compliant)',
    isCompliant: true,
  };
}

/**
 * Validates all compliance requirements
 */
export function validateCompliance(data: {
  birth_date?: string | null;
  salary?: string | null;
  hasIdDocument?: boolean;
  minimumWage?: number;
}): ComplianceResult {
  const minimumWage = data.minimumWage ?? 600;
  const issues: ComplianceIssue[] = [];

  // Check age compliance
  const ageIssue = validateAge(data.birth_date);
  issues.push(ageIssue);

  // Check salary compliance
  const salaryIssue = validateMinimumWage(data.salary, minimumWage);
  issues.push(salaryIssue);

  // Check ID document
  const idIssue = validateIdUpload(data.hasIdDocument ?? false);
  issues.push(idIssue);

  const isCompliant = issues.every((issue) => issue.isCompliant);

  return {
    isCompliant,
    issues,
  };
}

