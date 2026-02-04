import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

// ==================== INTERFACES ====================

interface ValidationWarning {
  line: number;
  field: string;
  issue: string;
  originalValue: string;
  adjustedValue: string;
}

interface ProcessResult {
  success: boolean;
  warnings: ValidationWarning[];
  recordsProcessed: {
    furips1: number;
    furips2: number;
    furtran: number;
  };
  backupsCreated: {
    furips1: number;
    furips2: number;
    furtran: number;
  };
  error?: string;
}

// ==================== UTILIDADES DE VALIDACIÓN ====================

/**
 * Valida y convierte una fecha - Soporta DD/MM/YYYY, D/M/YYYY, YYYY/MM/DD, YYYY-MM-DD
 */
function parseDate(value: string, fieldName: string, lineNumber: number, warnings: ValidationWarning[]): Date | null {
  if (!value || value.trim() === "") {
    return null;
  }

  const trimmed = value.trim();
  let year: number, month: number, day: number;
  
  // Formato DD/MM/YYYY o D/M/YYYY (con o sin ceros a la izquierda)
  const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10);
    year = parseInt(dmyMatch[3], 10);
  } else {
    // Formato YYYY/MM/DD o YYYY/M/D
    const ymdMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (ymdMatch) {
      year = parseInt(ymdMatch[1], 10);
      month = parseInt(ymdMatch[2], 10);
      day = parseInt(ymdMatch[3], 10);
    } else {
      // Formato YYYY-MM-DD (ISO)
      const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        year = parseInt(isoMatch[1], 10);
        month = parseInt(isoMatch[2], 10);
        day = parseInt(isoMatch[3], 10);
      } else {
        warnings.push({
          line: lineNumber,
          field: fieldName,
          issue: "Formato de fecha inválido (use DD/MM/YYYY, D/M/YYYY, YYYY/MM/DD o YYYY-MM-DD)",
          originalValue: trimmed,
          adjustedValue: "NULL",
        });
        return null;
      }
    }
  }

  // Validar rangos
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    warnings.push({
      line: lineNumber,
      field: fieldName,
      issue: "Fecha fuera de rango válido",
      originalValue: trimmed,
      adjustedValue: "NULL",
    });
    return null;
  }

  try {
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      throw new Error("Invalid date");
    }
    return date;
  } catch {
    warnings.push({
      line: lineNumber,
      field: fieldName,
      issue: "Fecha inválida",
      originalValue: trimmed,
      adjustedValue: "NULL",
    });
    return null;
  }
}

/**
 * Valida y convierte una hora en formato HH:MM:SS o HH:MM
 */
function parseTime(value: string, fieldName: string, lineNumber: number, warnings: ValidationWarning[]): Date | null {
  if (!value || value.trim() === "") {
    return null;
  }

  const trimmed = value.trim();
  const timePattern = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
  
  if (!timePattern.test(trimmed)) {
    warnings.push({
      line: lineNumber,
      field: fieldName,
      issue: "Formato de hora inválido (use HH:MM:SS o HH:MM)",
      originalValue: trimmed,
      adjustedValue: "NULL",
    });
    return null;
  }

  const match = trimmed.match(timePattern)!;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = match[3] ? parseInt(match[3], 10) : 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    warnings.push({
      line: lineNumber,
      field: fieldName,
      issue: "Hora fuera de rango válido",
      originalValue: trimmed,
      adjustedValue: "NULL",
    });
    return null;
  }

  // Crear una fecha con solo el tiempo
  const date = new Date(2000, 0, 1, hours, minutes, seconds);
  return date;
}

/**
 * Valida y convierte un número decimal
 */
function parseDecimal(value: string, fieldName: string, lineNumber: number, warnings: ValidationWarning[]): number | null {
  if (!value || value.trim() === "") {
    return null;
  }

  const trimmed = value.trim();
  const num = parseFloat(trimmed);

  if (isNaN(num)) {
    warnings.push({
      line: lineNumber,
      field: fieldName,
      issue: "Valor numérico inválido",
      originalValue: trimmed,
      adjustedValue: "NULL",
    });
    return null;
  }

  return num;
}

/**
 * Valida y convierte un número entero
 */
function parseInteger(value: string, fieldName: string, lineNumber: number, warnings: ValidationWarning[]): number | null {
  if (!value || value.trim() === "") {
    return null;
  }

  const trimmed = value.trim();
  const num = parseInt(trimmed, 10);

  if (isNaN(num)) {
    warnings.push({
      line: lineNumber,
      field: fieldName,
      issue: "Valor entero inválido",
      originalValue: trimmed,
      adjustedValue: "NULL",
    });
    return null;
  }

  return num;
}

/**
 * Trunca un string si excede la longitud máxima
 */
function truncateString(value: string | null, maxLength: number, fieldName: string, lineNumber: number, warnings: ValidationWarning[]): string | null {
  if (!value) return null;

  if (value.length > maxLength) {
    const truncated = value.substring(0, maxLength);
    warnings.push({
      line: lineNumber,
      field: fieldName,
      issue: `Campo excede longitud máxima de ${maxLength} caracteres`,
      originalValue: `${value.substring(0, 50)}... (${value.length} chars)`,
      adjustedValue: `${truncated.substring(0, 50)}... (truncado a ${maxLength} chars)`,
    });
    return truncated;
  }

  return value;
}

// ==================== PROCESAMIENTO DE DATOS ====================

/**
 * Procesa una línea de FURIPS1 y retorna un objeto listo para insertar
 * SIMPLIFICADO: Solo trunca strings, sin validaciones complejas de fechas/horas
 */
function processFurips1Line(
  fields: string[],
  numeroLote: number,
  usuario: string
): any {
  if (fields.length !== 102) {
    return null; // Retornar null si no cumple
  }

  // Helper robusto para fechas que maneja múltiples formatos
  const parseRobustDate = (val: string) => {
    if (!val || val.trim() === "") return null;
    
    const trimmed = val.trim();
    let year: number, month: number, day: number;
    
    // Formato DD/MM/YYYY o D/M/YYYY (con o sin ceros)
    const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
      day = parseInt(dmyMatch[1], 10);
      month = parseInt(dmyMatch[2], 10);
      year = parseInt(dmyMatch[3], 10);
      try {
        return new Date(year, month - 1, day);
      } catch {
        return null;
      }
    }
    
    // Formato YYYY/MM/DD o YYYY/M/D
    const ymdMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (ymdMatch) {
      year = parseInt(ymdMatch[1], 10);
      month = parseInt(ymdMatch[2], 10);
      day = parseInt(ymdMatch[3], 10);
      try {
        return new Date(year, month - 1, day);
      } catch {
        return null;
      }
    }
    
    // Formato YYYY-MM-DD (ISO)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10);
      day = parseInt(isoMatch[3], 10);
      try {
        return new Date(year, month - 1, day);
      } catch {
        return null;
      }
    }
    
    return null;
  };

  // Helper robusto para horas que maneja H:MM y HH:MM
  const parseRobustTime = (val: string) => {
    if (!val || val.trim() === "") return null;
    
    const trimmed = val.trim();
    
    // Formato H:MM o HH:MM (con o sin ceros a la izquierda)
    const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const s = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      
      if (h >= 0 && h < 24 && m >= 0 && m < 60 && s >= 0 && s < 60) {
        return new Date(2000, 0, 1, h, m, s);
      }
    }
    
    return null;
  };

  return {
    Numero_radicado_anterior: (fields[0] || "").substring(0, 50) || null,
    RGO_Respuesta_a_Glosa_u_objecion: (fields[1] || "").substring(0, 50) || null,
    Numero_factura: (fields[2] || "").substring(0, 50) || null,
    Numero_consecutivo_reclamacion: (fields[3] || "").substring(0, 50) || null,
    Codigo_habilitacion_prestador_servicios_salud: (fields[4] || "").substring(0, 50) || null,
    Primer_apellido_victima: (fields[5] || "").substring(0, 50) || null,
    Segundo_apellido_victima: (fields[6] || "").substring(0, 50) || null,
    Primer_nombre_victima: (fields[7] || "").substring(0, 50) || null,
    Segundo_nombre_victima: (fields[8] || "").substring(0, 50) || null,
    Tipo_documento_de_identidad_victima: (fields[9] || "").substring(0, 10) || null,
    Numero_documento_de_identidad_victima: (fields[10] || "").substring(0, 20) || null,
    Fecha_nacimiento_victima: parseRobustDate(fields[11]),
    Fecha_fallecimiento: parseRobustDate(fields[12]),
    Sexo_victima: (fields[13] || "").substring(0, 1) || null,
    Direccion_residencia_victima: (fields[14] || "").substring(0, 300) || null,
    Codigo_departamento_de_residencia_victima: (fields[15] || "").substring(0, 2) || null,
    Codigo_municipio_residencia_victima: (fields[16] || "").substring(0, 3) || null,
    Telefono_victima: (fields[17] || "").substring(0, 20) || null,
    Condicion_victima: (fields[18] || "").substring(0, 50) || null,
    Naturaleza_evento: (fields[19] || "").substring(0, 50) || null,
    Descripcion_otro_evento: (fields[20] || "").substring(0, 300) || null,
    Direccion_ocurrencia_evento: (fields[21] || "").substring(0, 300) || null,
    Fecha_ocurrencia_evento: parseRobustDate(fields[22]),
    Hora_ocurrencia_evento: parseRobustTime(fields[23]),
    Codigo_departamento_ocurrencia_evento: (fields[24] || "").substring(0, 2) || null,
    Codigo_municipio_ocurrencia_evento: (fields[25] || "").substring(0, 3) || null,
    Zona_ocurrencia_evento: (fields[26] || "").substring(0, 50) || null,
    Estado_aseguramiento: (fields[27] || "").substring(0, 50) || null,
    Marca: (fields[28] || "").substring(0, 50) || null,
    Placa: (fields[29] || "").substring(0, 50) || null,
    Tipo_Vehiculo: (fields[30] || "").substring(0, 50) || null,
    Codigo_aseguradora: (fields[31] || "").substring(0, 50) || null,
    Numero_poliza_SOAT: (fields[32] || "").substring(0, 50) || null,
    Fecha_inicio_vigencia_de_poliza: parseRobustDate(fields[33]),
    Fecha_final_vigencia_poliza: parseRobustDate(fields[34]),
    Numero_radicado_SIRAS: (fields[35] || "").substring(0, 50) || null,
    Cobro_por_agotamiento_tope_Aseguradora: (fields[36] || "").substring(0, 50) || null,
    Codigo_CUPS_servicio_principal_hospitalizacion: (fields[37] || "").substring(0, 50) || null,
    Complejidad_procedimiento_quirurgico: (fields[38] || "").substring(0, 50) || null,
    Codigo_CUPS_procedimiento_quirurgico_principal: (fields[39] || "").substring(0, 50) || null,
    Codigo_CUPS_procedimiento_quirurgico_secundario: (fields[40] || "").substring(0, 50) || null,
    Se_presto_servicio_UCI: (fields[41] || "").substring(0, 50) || null,
    Dias_UCI_reclamados: parseInt(fields[42] || "0", 10) || null,
    Tipo_documento_de_identidad_propietario: (fields[43] || "").substring(0, 10) || null,
    Numero_documento_identidad_propietario: (fields[44] || "").substring(0, 20) || null,
    Primer_apellido_propietario: (fields[45] || "").substring(0, 50) || null,
    Segundo_apellido_propietario: (fields[46] || "").substring(0, 50) || null,
    Primer_nombre_propietario: (fields[47] || "").substring(0, 50) || null,
    Segundo_nombre_propietario: (fields[48] || "").substring(0, 50) || null,
    Direccion_residencia_propietario: (fields[49] || "").substring(0, 300) || null,
    Telefono_residencia_propietario: (fields[50] || "").substring(0, 20) || null,
    Codigo_departamento_residencia_propietario: (fields[51] || "").substring(0, 2) || null,
    Codigo_municipio_residencia_propietario: (fields[52] || "").substring(0, 3) || null,
    Primer_apellido_conductor: (fields[53] || "").substring(0, 50) || null,
    Segundo_apellido_conductor: (fields[54] || "").substring(0, 50) || null,
    Primer_nombre_conductor: (fields[55] || "").substring(0, 50) || null,
    Segundo_nombre_conductor: (fields[56] || "").substring(0, 50) || null,
    Tipo_documento_identidad_conductor: (fields[57] || "").substring(0, 10) || null,
    Numero_documento_identidad_conductor: (fields[58] || "").substring(0, 20) || null,
    Direccion_residencia_conductor: (fields[59] || "").substring(0, 300) || null,
    Codigo_departamento_residencia_conductor: (fields[60] || "").substring(0, 2) || null,
    Codigo_municipio_residencia_conductor: (fields[61] || "").substring(0, 3) || null,
    Telefono_residencia_conductor: (fields[62] || "").substring(0, 20) || null,
    Tipo_referencia: (fields[63] || "").substring(0, 50) || null,
    Fecha_remision: parseRobustDate(fields[64]),
    Hora_salida: parseRobustTime(fields[65]),
    Codigo_habilitacion_prestador_servicios_de_salud_remitente: (fields[66] || "").substring(0, 50) || null,
    Profesional_que_remite: (fields[67] || "").substring(0, 50) || null,
    Cargo_persona_que_remite: (fields[68] || "").substring(0, 50) || null,
    Fecha_ingreso: parseRobustDate(fields[69]),
    Hora_ingreso: parseRobustTime(fields[70]),
    Codigo_habilitacion_prestador_servicios_salud_que_recibe: (fields[71] || "").substring(0, 50) || null,
    Profesional_que_recibe: (fields[72] || "").substring(0, 50) || null,
    Placa_ambulancia_que_realiza_el_traslado_interinstitucional: (fields[73] || "").substring(0, 50) || null,
    Placa_ambulancia_traslado_primario: (fields[74] || "").substring(0, 50) || null,
    Transporte_victima_desde_el_sitio_evento: (fields[75] || "").substring(0, 60) || null,
    Transporte_victima_hasta_el_fin_recorrido: (fields[76] || "").substring(0, 50) || null,
    Tipo_servicio_transporte: (fields[77] || "").substring(0, 50) || null,
    Zona_donde_recoge_victima: (fields[78] || "").substring(0, 50) || null,
    Fecha_ingreso1: parseRobustDate(fields[79]),
    Hora_ingreso1: parseRobustTime(fields[80]),
    Fecha_egreso: parseRobustDate(fields[81]),
    Hora_egreso: parseRobustTime(fields[82]),
    Codigo_diagnostico_principal_ingreso: (fields[83] || "").substring(0, 50) || null,
    Codigo_diagnostico_ingreso_asociado_1: (fields[84] || "").substring(0, 50) || null,
    Codigo_diagnostico_ingreso_asociado_2: (fields[85] || "").substring(0, 50) || null,
    Codigo_diagnostico_principal_egreso: (fields[86] || "").substring(0, 50) || null,
    Codigo_diagnostico_egreso_asociado_1: (fields[87] || "").substring(0, 50) || null,
    Codigo_diagnostico_egreso_asociado_2: (fields[88] || "").substring(0, 50) || null,
    Primer_apellido_medico: (fields[89] || "").substring(0, 50) || null,
    Segundo_apellido_medico: (fields[90] || "").substring(0, 50) || null,
    Primer_nombre_medico: (fields[91] || "").substring(0, 50) || null,
    Segundo_nombre_medico: (fields[92] || "").substring(0, 50) || null,
    Tipo_documento_identidad_medico: (fields[93] || "").substring(0, 10) || null,
    Numero_documento_de_identidad_medico: (fields[94] || "").substring(0, 20) || null,
    Numero_registro_medico: (fields[95] || "").substring(0, 50) || null,
    Total_facturado_por_amparo_gastos_medicos_quirurgicos: parseFloat(fields[96] || "0") || null,
    Total_reclamado_por_amparo_gastos_medicos_quirurgicos: parseFloat(fields[97] || "0") || null,
    Total_facturado_por_amparo_gastos_transporte: parseFloat(fields[98] || "0") || null,
    Total_reclamado_por_amparo_gastos_transporte: parseFloat(fields[99] || "0") || null,
    Manifestacion_servicios_habilitados: (fields[100] || "").substring(0, 300) || null,
    Descripcion_evento: (fields[101] || "").substring(0, 1000) || null,
    numero_lote: numeroLote,
    usuario: usuario,
  };
}

/**
 * Procesa una línea de FURIPS2 y retorna un objeto listo para insertar
 * SIMPLIFICADO: Solo trunca strings, sin validaciones complejas
 */
function processFurips2Line(
  fields: string[],
  numeroLote: number,
  usuario: string
): any {
  if (fields.length !== 9) {
    return null; // Retornar null si no cumple
  }

  return {
    Numero_factura: (fields[0] || "").substring(0, 50) || null,
    Numero_consecutivo_de_la_reclamacion: (fields[1] || "").substring(0, 50) || null,
    Tipo_de_servicio: (fields[2] || "").substring(0, 50) || null,
    Codigo_del_servicio: (fields[3] || "").substring(0, 50) || null,
    Descripcion_del_servicio_o_elemento_reclamado: (fields[4] || "").substring(0, 300) || null,
    Cantidad_de_servicios: parseInt(fields[5] || "0", 10) || null,
    Valor_unitario: parseFloat(fields[6] || "0") || null,
    Valor_total_facturado: parseFloat(fields[7] || "0") || null,
    Valor_total_reclamado: parseFloat(fields[8] || "0") || null,
    numero_lote: numeroLote,
    usuario: usuario,
  };
}

/**
 * Procesa una línea de FURTRAN y retorna un objeto listo para insertar
 */
function processFurtranLine(
  fields: string[],
  lineNumber: number,
  warnings: ValidationWarning[]
): any {
  if (fields.length !== 46) {
    throw new Error(`Línea ${lineNumber}: Se esperan 46 campos, se encontraron ${fields.length}`);
  }

  return {
    Numero_radicado_anterior: truncateString(fields[0] || null, 20, "Numero_radicado_anterior", lineNumber, warnings),
    RGO_Respuesta_a_Glosa_u_objecion: truncateString(fields[1] || null, 255, "RGO_Respuesta_a_Glosa_u_objecion", lineNumber, warnings),
    Numero_factura_o_documento_equivalente: truncateString(fields[2] || "", 20, "Numero_factura_o_documento_equivalente", lineNumber, warnings),
    Codigo_habilitacion_prestador_servicios_salud: truncateString(fields[3] || null, 12, "Codigo_habilitacion_prestador_servicios_salud", lineNumber, warnings),
    Primer_apellido_reclamante: truncateString(fields[4] || null, 20, "Primer_apellido_reclamante", lineNumber, warnings),
    Segundo_apellido_reclamante: truncateString(fields[5] || null, 30, "Segundo_apellido_reclamante", lineNumber, warnings),
    Primer_nombre_reclamante: truncateString(fields[6] || null, 20, "Primer_nombre_reclamante", lineNumber, warnings),
    Segundo_nombre_reclamante: truncateString(fields[7] || null, 30, "Segundo_nombre_reclamante", lineNumber, warnings),
    Tipo_documento_identificacion_reclamante: truncateString(fields[8] || null, 2, "Tipo_documento_identificacion_reclamante", lineNumber, warnings),
    Numero_documento_identificacion_reclamante: truncateString(fields[9] || null, 16, "Numero_documento_identificacion_reclamante", lineNumber, warnings),
    Tipo_Vehiculo_servicio_ambulancia: parseInteger(fields[10] || "", "Tipo_Vehiculo_servicio_ambulancia", lineNumber, warnings),
    Placa_vehiculo_traslado: truncateString(fields[11] || null, 10, "Placa_vehiculo_traslado", lineNumber, warnings),
    Direccion_reclamante: truncateString(fields[12] || null, 40, "Direccion_reclamante", lineNumber, warnings),
    Telefono_reclamante: truncateString(fields[13] || null, 10, "Telefono_reclamante", lineNumber, warnings),
    Codigo_departamento_residencia_reclamante: truncateString(fields[14] || null, 2, "Codigo_departamento_residencia_reclamante", lineNumber, warnings),
    Codigo_municipio_residencia_reclamante: truncateString(fields[15] || null, 3, "Codigo_municipio_residencia_reclamante", lineNumber, warnings),
    Tipo_documento_identidad_victima: truncateString(fields[16] || null, 2, "Tipo_documento_identidad_victima", lineNumber, warnings),
    Numero_documento_identidad_victima: truncateString(fields[17] || null, 16, "Numero_documento_identidad_victima", lineNumber, warnings),
    Primer_nombre_victima: truncateString(fields[18] || null, 20, "Primer_nombre_victima", lineNumber, warnings),
    Segundo_nombre_victima: truncateString(fields[19] || null, 30, "Segundo_nombre_victima", lineNumber, warnings),
    Primer_apellido_victima: truncateString(fields[20] || null, 20, "Primer_apellido_victima", lineNumber, warnings),
    Segundo_apellido_victima: truncateString(fields[21] || null, 30, "Segundo_apellido_victima", lineNumber, warnings),
    Fecha_nacimiento_victima: parseDate(fields[22] || "", "Fecha_nacimiento_victima", lineNumber, warnings),
    Sexo_victima: truncateString(fields[23] || null, 1, "Sexo_victima", lineNumber, warnings),
    Tipo_evento_movilizacion: parseInteger(fields[24] || "", "Tipo_evento_movilizacion", lineNumber, warnings),
    Direccion_recoge_victima: truncateString(fields[25] || null, 40, "Direccion_recoge_victima", lineNumber, warnings),
    Codigo_departamento_recoge_victima: truncateString(fields[26] || null, 2, "Codigo_departamento_recoge_victima", lineNumber, warnings),
    Codigo_municipio_recoge_victima: truncateString(fields[27] || null, 3, "Codigo_municipio_recoge_victima", lineNumber, warnings),
    Zona_recoge_victima: truncateString(fields[28] || null, 1, "Zona_recoge_victima", lineNumber, warnings),
    Fecha_traslado_victima: parseDate(fields[29] || "", "Fecha_traslado_victima", lineNumber, warnings),
    Hora_traslado_victima: parseTime(fields[30] || "", "Hora_traslado_victima", lineNumber, warnings),
    Codigo_habilitacion_IPS_recepcion: truncateString(fields[31] || null, 12, "Codigo_habilitacion_IPS_recepcion", lineNumber, warnings),
    Codigo_departamento_traslada_victima: truncateString(fields[32] || null, 2, "Codigo_departamento_traslada_victima", lineNumber, warnings),
    Codigo_municipio_traslada_victima: truncateString(fields[33] || null, 3, "Codigo_municipio_traslada_victima", lineNumber, warnings),
    Condicion_victima: parseInteger(fields[34] || "", "Condicion_victima", lineNumber, warnings),
    Estado_aseguramiento: parseInteger(fields[35] || "", "Estado_aseguramiento", lineNumber, warnings),
    Tipo_Vehiculo: parseInteger(fields[36] || "", "Tipo_Vehiculo", lineNumber, warnings),
    Placa_Vehiculo_involucrado: truncateString(fields[37] || null, 10, "Placa_Vehiculo_involucrado", lineNumber, warnings),
    Codigo_aseguradora: truncateString(fields[38] || null, 6, "Codigo_aseguradora", lineNumber, warnings),
    Numero_poliza_SOAT: truncateString(fields[39] || null, 20, "Numero_poliza_SOAT", lineNumber, warnings),
    Fecha_inicio_vigencia_poliza: parseDate(fields[40] || "", "Fecha_inicio_vigencia_poliza", lineNumber, warnings),
    Fecha_final_vigencia_poliza: parseDate(fields[41] || "", "Fecha_final_vigencia_poliza", lineNumber, warnings),
    Numero_radicado_SIRAS: truncateString(fields[42] || null, 20, "Numero_radicado_SIRAS", lineNumber, warnings),
    Valor_facturado: parseDecimal(fields[43] || "", "Valor_facturado", lineNumber, warnings),
    Valor_reclamado: parseDecimal(fields[44] || "", "Valor_reclamado", lineNumber, warnings),
    Manifestacion_servicios_habilitados: parseInteger(fields[45] || "", "Manifestacion_servicios_habilitados", lineNumber, warnings),
  };
}

// ==================== FUNCIÓN PRINCIPAL ====================

/**
 * Procesa y guarda los datos de FURIPS1, FURIPS2 y FURTRAN en la base de datos.
 * Crea backups, valida datos y maneja advertencias.
 */
export async function processFuripsData(
  furips1Content: string,
  furips2Content: string,
  furtranContent: string | null,
  numeroLote: number,
  usuario: string
): Promise<ProcessResult> {
  const warnings: ValidationWarning[] = [];
  const result: ProcessResult = {
    success: false,
    warnings: [],
    recordsProcessed: {
      furips1: 0,
      furips2: 0,
      furtran: 0,
    },
    backupsCreated: {
      furips1: 0,
      furips2: 0,
      furtran: 0,
    },
  };

  try {
    console.log("🔄 Iniciando procesamiento de datos FURIPS...");

    // Truncar usuario a 20 caracteres (límite de la BD)
    const usuarioTruncado = usuario.substring(0, 20);
    console.log(`👤 Usuario: ${usuarioTruncado}`);

    // ==================== CREAR BACKUPS ====================
    console.log("📦 Creando backups de tablas existentes...");

    // Backup FURIPS1
    const furips1BackupCount = await prisma.$executeRaw`
      INSERT INTO furips1_backup SELECT * FROM furips1
    `;
    result.backupsCreated.furips1 = Number(furips1BackupCount);
    console.log(`✅ Backup FURIPS1: ${result.backupsCreated.furips1} registros`);

    // Backup FURIPS2
    const furips2BackupCount = await prisma.$executeRaw`
      INSERT INTO furips2_backup SELECT * FROM furips2
    `;
    result.backupsCreated.furips2 = Number(furips2BackupCount);
    console.log(`✅ Backup FURIPS2: ${result.backupsCreated.furips2} registros`);

    // Backup FURTRAN (SOLO si existe contenido)
    if (furtranContent && furtranContent.trim() !== "") {
      try {
        const furtranBackupCount = await prisma.$executeRaw`
          INSERT INTO FURTRAN_backup SELECT * FROM FURTRAN
        `;
        result.backupsCreated.furtran = Number(furtranBackupCount);
        console.log(`✅ Backup FURTRAN: ${result.backupsCreated.furtran} registros`);
      } catch (err) {
        console.warn("⚠️ No se pudo crear backup de FURTRAN (posiblemente vacía)");
      }
    }

    // ==================== ELIMINAR DATOS EXISTENTES ====================
    console.log("🗑️  Limpiando tablas...");
    
    await prisma.$executeRaw`DELETE FROM furips1`;
    await prisma.$executeRaw`DELETE FROM furips2`;
    if (furtranContent && furtranContent.trim() !== "") {
      await prisma.$executeRaw`DELETE FROM FURTRAN`;
    }

    console.log("✅ Tablas limpiadas");

    // ==================== PROCESAR FURIPS1 (INSERT MASIVO) ====================
    if (furips1Content) {
      console.log("📊 Procesando FURIPS1...");
      const lines = furips1Content.trim().split("\n").filter(line => line.trim() !== "");
      
      // Preparar todos los registros
      const records = [];
      for (let i = 0; i < lines.length; i++) {
        const fields = lines[i].split(",");
        const record = processFurips1Line(fields, numeroLote, usuarioTruncado);
        if (record) {
          records.push(record);
        }
      }
      
      // INSERT MASIVO (una sola query)
      if (records.length > 0) {
        try {
          await prisma.furips1.createMany({
            data: records,
            skipDuplicates: true,
          });
          result.recordsProcessed.furips1 = records.length;
        } catch (error: any) {
          console.error("Error insertando FURIPS1:", error);
          throw error;
        }
      }
      
      console.log(`✅ FURIPS1: ${result.recordsProcessed.furips1} registros insertados`);
    }

    // ==================== PROCESAR FURIPS2 (INSERT MASIVO) ====================
    if (furips2Content) {
      console.log("📊 Procesando FURIPS2...");
      const lines = furips2Content.trim().split("\n").filter(line => line.trim() !== "");
      
      // Preparar todos los registros
      const records = [];
      for (let i = 0; i < lines.length; i++) {
        const fields = lines[i].split(",");
        const record = processFurips2Line(fields, numeroLote, usuarioTruncado);
        if (record) {
          records.push(record);
        }
      }
      
      // INSERT MASIVO (una sola query)
      if (records.length > 0) {
        try {
          await prisma.furips2.createMany({
            data: records,
            skipDuplicates: true,
          });
          result.recordsProcessed.furips2 = records.length;
        } catch (error: any) {
          console.error("Error insertando FURIPS2:", error);
          throw error;
        }
      }
      
      console.log(`✅ FURIPS2: ${result.recordsProcessed.furips2} registros insertados`);
    }

    // ==================== PROCESAR FURTRAN (SOLO SI EXISTE) ====================
    if (furtranContent && furtranContent.trim() !== "") {
      console.log("📊 Procesando FURTRAN...");
      const lines = furtranContent.trim().split("\n").filter(line => line.trim() !== "");
      
      for (let i = 0; i < lines.length; i++) {
        const fields = lines[i].split(",");
        try {
          const record = processFurtranLine(fields, i + 1, warnings);
          
          await prisma.$executeRaw`
            INSERT INTO FURTRAN (
              Numero_radicado_anterior, RGO_Respuesta_a_Glosa_u_objecion,
              Numero_factura_o_documento_equivalente, Codigo_habilitacion_prestador_servicios_salud,
              Primer_apellido_reclamante, Segundo_apellido_reclamante, Primer_nombre_reclamante,
              Segundo_nombre_reclamante, Tipo_documento_identificacion_reclamante,
              Numero_documento_identificacion_reclamante, Tipo_Vehiculo_servicio_ambulancia,
              Placa_vehiculo_traslado, Direccion_reclamante, Telefono_reclamante,
              Codigo_departamento_residencia_reclamante, Codigo_municipio_residencia_reclamante,
              Tipo_documento_identidad_victima, Numero_documento_identidad_victima,
              Primer_nombre_victima, Segundo_nombre_victima, Primer_apellido_victima,
              Segundo_apellido_victima, Fecha_nacimiento_victima, Sexo_victima,
              Tipo_evento_movilizacion, Direccion_recoge_victima, Codigo_departamento_recoge_victima,
              Codigo_municipio_recoge_victima, Zona_recoge_victima, Fecha_traslado_victima,
              Hora_traslado_victima, Codigo_habilitacion_IPS_recepcion,
              Codigo_departamento_traslada_victima, Codigo_municipio_traslada_victima,
              Condicion_victima, Estado_aseguramiento, Tipo_Vehiculo, Placa_Vehiculo_involucrado,
              Codigo_aseguradora, Numero_poliza_SOAT, Fecha_inicio_vigencia_poliza,
              Fecha_final_vigencia_poliza, Numero_radicado_SIRAS, Valor_facturado,
              Valor_reclamado, Manifestacion_servicios_habilitados
            ) VALUES (
              ${record.Numero_radicado_anterior}, ${record.RGO_Respuesta_a_Glosa_u_objecion},
              ${record.Numero_factura_o_documento_equivalente}, ${record.Codigo_habilitacion_prestador_servicios_salud},
              ${record.Primer_apellido_reclamante}, ${record.Segundo_apellido_reclamante},
              ${record.Primer_nombre_reclamante}, ${record.Segundo_nombre_reclamante},
              ${record.Tipo_documento_identificacion_reclamante}, ${record.Numero_documento_identificacion_reclamante},
              ${record.Tipo_Vehiculo_servicio_ambulancia}, ${record.Placa_vehiculo_traslado},
              ${record.Direccion_reclamante}, ${record.Telefono_reclamante},
              ${record.Codigo_departamento_residencia_reclamante}, ${record.Codigo_municipio_residencia_reclamante},
              ${record.Tipo_documento_identidad_victima}, ${record.Numero_documento_identidad_victima},
              ${record.Primer_nombre_victima}, ${record.Segundo_nombre_victima},
              ${record.Primer_apellido_victima}, ${record.Segundo_apellido_victima},
              ${record.Fecha_nacimiento_victima}, ${record.Sexo_victima},
              ${record.Tipo_evento_movilizacion}, ${record.Direccion_recoge_victima},
              ${record.Codigo_departamento_recoge_victima}, ${record.Codigo_municipio_recoge_victima},
              ${record.Zona_recoge_victima}, ${record.Fecha_traslado_victima}, ${record.Hora_traslado_victima},
              ${record.Codigo_habilitacion_IPS_recepcion}, ${record.Codigo_departamento_traslada_victima},
              ${record.Codigo_municipio_traslada_victima}, ${record.Condicion_victima},
              ${record.Estado_aseguramiento}, ${record.Tipo_Vehiculo}, ${record.Placa_Vehiculo_involucrado},
              ${record.Codigo_aseguradora}, ${record.Numero_poliza_SOAT},
              ${record.Fecha_inicio_vigencia_poliza}, ${record.Fecha_final_vigencia_poliza},
              ${record.Numero_radicado_SIRAS}, ${record.Valor_facturado}, ${record.Valor_reclamado},
              ${record.Manifestacion_servicios_habilitados}
            )
          `;
          
          result.recordsProcessed.furtran++;
        } catch (err: any) {
          warnings.push({
            line: i + 1,
            field: "FURTRAN",
            issue: `Error al insertar registro: ${err.message}`,
            originalValue: lines[i].substring(0, 100),
            adjustedValue: "OMITIDO",
          });
        }
      }
      
      console.log(`✅ FURTRAN: ${result.recordsProcessed.furtran} registros insertados`);
    }

    result.warnings = warnings;
    result.success = true;

    console.log("✅ Procesamiento completado exitosamente");
    console.log(`📊 Total registros: FURIPS1=${result.recordsProcessed.furips1}, FURIPS2=${result.recordsProcessed.furips2}, FURTRAN=${result.recordsProcessed.furtran}`);
    console.log(`⚠️  Total advertencias: ${warnings.length}`);

    return result;
  } catch (error: any) {
    console.error("❌ Error en procesamiento:", error);
    result.error = error.message;
    result.warnings = warnings;
    return result;
  }
}
