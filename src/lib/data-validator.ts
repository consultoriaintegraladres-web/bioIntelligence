/**
 * Utilidades para validar y convertir tipos de datos antes de insertar en la base de datos
 */

export interface ValidationWarning {
  field: string;
  originalValue: string;
  issue: string;
  action: string;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  value: any;
}

/**
 * Convierte una fecha en formato DD/MM/YYYY o YYYY-MM-DD a Date
 * Retorna null si no es válida
 */
export function parseDate(dateStr: string, fieldName: string): ValidationResult {
  const warnings: ValidationWarning[] = [];
  
  if (!dateStr || dateStr.trim() === "") {
    return { isValid: true, warnings: [], value: null };
  }

  const trimmed = dateStr.trim();
  
  // Intentar varios formatos
  const formats = [
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // YYYYMMDD
    /^(\d{4})(\d{2})(\d{2})$/,
  ];

  for (const format of formats) {
    const match = trimmed.match(format);
    if (match) {
      let year, month, day;
      
      if (format.source.includes("\\/")) {
        // DD/MM/YYYY
        day = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
      } else if (format.source.includes("-")) {
        // YYYY-MM-DD
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        day = parseInt(match[3], 10);
      } else {
        // YYYYMMDD
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        day = parseInt(match[3], 10);
      }

      const date = new Date(year, month - 1, day);
      
      // Validar que la fecha es real
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return { isValid: true, warnings: [], value: date };
      }
    }
  }

  warnings.push({
    field: fieldName,
    originalValue: trimmed,
    issue: "Formato de fecha inválido",
    action: "Se convertirá a NULL",
  });

  return { isValid: true, warnings, value: null };
}

/**
 * Convierte una hora en formato HH:MM:SS o HH:MM a Time
 * Retorna null si no es válida
 */
export function parseTime(timeStr: string, fieldName: string): ValidationResult {
  const warnings: ValidationWarning[] = [];
  
  if (!timeStr || timeStr.trim() === "") {
    return { isValid: true, warnings: [], value: null };
  }

  const trimmed = timeStr.trim();
  
  // Formato HH:MM:SS o HH:MM
  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;
    
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60) {
      // Crear un Date con la hora del día
      const date = new Date();
      date.setHours(hours, minutes, seconds, 0);
      return { isValid: true, warnings: [], value: date };
    }
  }

  warnings.push({
    field: fieldName,
    originalValue: trimmed,
    issue: "Formato de hora inválido",
    action: "Se convertirá a NULL",
  });

  return { isValid: true, warnings, value: null };
}

/**
 * Valida y convierte un número entero
 */
export function parseIntSafe(value: string, fieldName: string): ValidationResult {
  const warnings: ValidationWarning[] = [];
  
  if (!value || value.trim() === "") {
    return { isValid: true, warnings: [], value: null };
  }

  const trimmed = value.trim();
  const num = parseInt(trimmed, 10);
  
  if (isNaN(num)) {
    warnings.push({
      field: fieldName,
      originalValue: trimmed,
      issue: "No es un número válido",
      action: "Se convertirá a NULL",
    });
    return { isValid: true, warnings, value: null };
  }

  return { isValid: true, warnings: [], value: num };
}

/**
 * Valida y convierte un número decimal
 */
export function parseDecimal(value: string, fieldName: string): ValidationResult {
  const warnings: ValidationWarning[] = [];
  
  if (!value || value.trim() === "") {
    return { isValid: true, warnings: [], value: null };
  }

  const trimmed = value.trim();
  const num = parseFloat(trimmed);
  
  if (isNaN(num)) {
    warnings.push({
      field: fieldName,
      originalValue: trimmed,
      issue: "No es un número válido",
      action: "Se convertirá a NULL",
    });
    return { isValid: true, warnings, value: null };
  }

  return { isValid: true, warnings: [], value: num };
}

/**
 * Valida y trunca un string si excede el máximo
 */
export function validateString(
  value: string,
  fieldName: string,
  maxLength: number
): ValidationResult {
  const warnings: ValidationWarning[] = [];
  
  if (!value) {
    return { isValid: true, warnings: [], value: null };
  }

  if (value.length > maxLength) {
    warnings.push({
      field: fieldName,
      originalValue: `${value.substring(0, 50)}... (${value.length} caracteres)`,
      issue: `Excede el máximo de ${maxLength} caracteres`,
      action: `Se recortará a ${maxLength} caracteres`,
    });
    return { isValid: true, warnings, value: value.substring(0, maxLength) };
  }

  return { isValid: true, warnings: [], value: value };
}
