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

/**
 * Convierte un valor numérico a Prisma.Decimal (para campos monetarios)
 */
function toDecimal(value: string): Prisma.Decimal | null {
  if (!value || value.trim() === "") return null;
  const num = parseFloat(value.trim());
  if (isNaN(num)) return null;
  return new Prisma.Decimal(num);
}

// ==================== PROCESAMIENTO DE DATOS ====================

/**
 * Procesa una línea de FURIPS1 y retorna un objeto listo para insertar
 * FLEXIBLE: Acepta 102 o más campos (maneja trailing commas)
 */
function processFurips1Line(
  fields: string[],
  numeroLote: number,
  usuario: string
): any {
  // Mínimo 100 campos para un registro válido (campos esenciales)
  // Aceptamos 102+ para manejar trailing commas
  if (fields.length < 100) {
    return null; // Retornar null si no tiene suficientes campos
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

  // Safely get field value (handles missing fields)
  const f = (index: number) => (fields[index] || "").trim();

  return {
    Numero_radicado_anterior: f(0).substring(0, 50) || null,
    RGO_Respuesta_a_Glosa_u_objecion: f(1).substring(0, 50) || null,
    Numero_factura: f(2).substring(0, 50) || null,
    Numero_consecutivo_reclamacion: f(3).substring(0, 50) || null,
    Codigo_habilitacion_prestador_servicios_salud: f(4).substring(0, 50) || null,
    Primer_apellido_victima: f(5).substring(0, 50) || null,
    Segundo_apellido_victima: f(6).substring(0, 50) || null,
    Primer_nombre_victima: f(7).substring(0, 50) || null,
    Segundo_nombre_victima: f(8).substring(0, 50) || null,
    Tipo_documento_de_identidad_victima: f(9).substring(0, 10) || null,
    Numero_documento_de_identidad_victima: f(10).substring(0, 20) || null,
    Fecha_nacimiento_victima: parseRobustDate(f(11)),
    Fecha_fallecimiento: parseRobustDate(f(12)),
    Sexo_victima: f(13).substring(0, 1) || null,
    Direccion_residencia_victima: f(14).substring(0, 300) || null,
    Codigo_departamento_de_residencia_victima: f(15).substring(0, 2) || null,
    Codigo_municipio_residencia_victima: f(16).substring(0, 3) || null,
    Telefono_victima: f(17).substring(0, 20) || null,
    Condicion_victima: f(18).substring(0, 50) || null,
    Naturaleza_evento: f(19).substring(0, 50) || null,
    Descripcion_otro_evento: f(20).substring(0, 300) || null,
    Direccion_ocurrencia_evento: f(21).substring(0, 300) || null,
    Fecha_ocurrencia_evento: parseRobustDate(f(22)),
    Hora_ocurrencia_evento: parseRobustTime(f(23)),
    Codigo_departamento_ocurrencia_evento: f(24).substring(0, 2) || null,
    Codigo_municipio_ocurrencia_evento: f(25).substring(0, 3) || null,
    Zona_ocurrencia_evento: f(26).substring(0, 50) || null,
    Estado_aseguramiento: f(27).substring(0, 50) || null,
    Marca: f(28).substring(0, 50) || null,
    Placa: f(29).substring(0, 50) || null,
    Tipo_Vehiculo: f(30).substring(0, 50) || null,
    Codigo_aseguradora: f(31).substring(0, 50) || null,
    Numero_poliza_SOAT: f(32).substring(0, 50) || null,
    Fecha_inicio_vigencia_de_poliza: parseRobustDate(f(33)),
    Fecha_final_vigencia_poliza: parseRobustDate(f(34)),
    Numero_radicado_SIRAS: f(35).substring(0, 50) || null,
    Cobro_por_agotamiento_tope_Aseguradora: f(36).substring(0, 50) || null,
    Codigo_CUPS_servicio_principal_hospitalizacion: f(37).substring(0, 50) || null,
    Complejidad_procedimiento_quirurgico: f(38).substring(0, 50) || null,
    Codigo_CUPS_procedimiento_quirurgico_principal: f(39).substring(0, 50) || null,
    Codigo_CUPS_procedimiento_quirurgico_secundario: f(40).substring(0, 50) || null,
    Se_presto_servicio_UCI: f(41).substring(0, 50) || null,
    Dias_UCI_reclamados: parseInt(f(42) || "0", 10) || null,
    Tipo_documento_de_identidad_propietario: f(43).substring(0, 10) || null,
    Numero_documento_identidad_propietario: f(44).substring(0, 20) || null,
    Primer_apellido_propietario: f(45).substring(0, 50) || null,
    Segundo_apellido_propietario: f(46).substring(0, 50) || null,
    Primer_nombre_propietario: f(47).substring(0, 50) || null,
    Segundo_nombre_propietario: f(48).substring(0, 50) || null,
    Direccion_residencia_propietario: f(49).substring(0, 300) || null,
    Telefono_residencia_propietario: f(50).substring(0, 20) || null,
    Codigo_departamento_residencia_propietario: f(51).substring(0, 2) || null,
    Codigo_municipio_residencia_propietario: f(52).substring(0, 3) || null,
    Primer_apellido_conductor: f(53).substring(0, 50) || null,
    Segundo_apellido_conductor: f(54).substring(0, 50) || null,
    Primer_nombre_conductor: f(55).substring(0, 50) || null,
    Segundo_nombre_conductor: f(56).substring(0, 50) || null,
    Tipo_documento_identidad_conductor: f(57).substring(0, 10) || null,
    Numero_documento_identidad_conductor: f(58).substring(0, 20) || null,
    Direccion_residencia_conductor: f(59).substring(0, 300) || null,
    Codigo_departamento_residencia_conductor: f(60).substring(0, 2) || null,
    Codigo_municipio_residencia_conductor: f(61).substring(0, 3) || null,
    Telefono_residencia_conductor: f(62).substring(0, 20) || null,
    Tipo_referencia: f(63).substring(0, 50) || null,
    Fecha_remision: parseRobustDate(f(64)),
    Hora_salida: parseRobustTime(f(65)),
    Codigo_habilitacion_prestador_servicios_de_salud_remitente: f(66).substring(0, 50) || null,
    Profesional_que_remite: f(67).substring(0, 50) || null,
    Cargo_persona_que_remite: f(68).substring(0, 50) || null,
    Fecha_ingreso: parseRobustDate(f(69)),
    Hora_ingreso: parseRobustTime(f(70)),
    Codigo_habilitacion_prestador_servicios_salud_que_recibe: f(71).substring(0, 50) || null,
    Profesional_que_recibe: f(72).substring(0, 50) || null,
    Placa_ambulancia_que_realiza_el_traslado_interinstitucional: f(73).substring(0, 50) || null,
    Placa_ambulancia_traslado_primario: f(74).substring(0, 50) || null,
    Transporte_victima_desde_el_sitio_evento: f(75).substring(0, 60) || null,
    Transporte_victima_hasta_el_fin_recorrido: f(76).substring(0, 50) || null,
    Tipo_servicio_transporte: f(77).substring(0, 50) || null,
    Zona_donde_recoge_victima: f(78).substring(0, 50) || null,
    Fecha_ingreso1: parseRobustDate(f(79)),
    Hora_ingreso1: parseRobustTime(f(80)),
    Fecha_egreso: parseRobustDate(f(81)),
    Hora_egreso: parseRobustTime(f(82)),
    Codigo_diagnostico_principal_ingreso: f(83).substring(0, 50) || null,
    Codigo_diagnostico_ingreso_asociado_1: f(84).substring(0, 50) || null,
    Codigo_diagnostico_ingreso_asociado_2: f(85).substring(0, 50) || null,
    Codigo_diagnostico_principal_egreso: f(86).substring(0, 50) || null,
    Codigo_diagnostico_egreso_asociado_1: f(87).substring(0, 50) || null,
    Codigo_diagnostico_egreso_asociado_2: f(88).substring(0, 50) || null,
    Primer_apellido_medico: f(89).substring(0, 50) || null,
    Segundo_apellido_medico: f(90).substring(0, 50) || null,
    Primer_nombre_medico: f(91).substring(0, 50) || null,
    Segundo_nombre_medico: f(92).substring(0, 50) || null,
    Tipo_documento_identidad_medico: f(93).substring(0, 10) || null,
    Numero_documento_de_identidad_medico: f(94).substring(0, 20) || null,
    Numero_registro_medico: f(95).substring(0, 50) || null,
    Total_facturado_por_amparo_gastos_medicos_quirurgicos: toDecimal(f(96)),
    Total_reclamado_por_amparo_gastos_medicos_quirurgicos: toDecimal(f(97)),
    Total_facturado_por_amparo_gastos_transporte: toDecimal(f(98)),
    Total_reclamado_por_amparo_gastos_transporte: toDecimal(f(99)),
    Manifestacion_servicios_habilitados: (fields[100] || "").substring(0, 300) || null,
    Descripcion_evento: (fields[101] || "").substring(0, 1000) || null,
    numero_lote: numeroLote,
    usuario: usuario,
    verificado2103: false,
    preauditoria: false,
    verificado2108: false,
    verificado_soat: false,
    verificado_infopol: false,
  };
}

/**
 * Procesa una línea de FURIPS2 y retorna un objeto listo para insertar
 * FLEXIBLE: Acepta 9 o más campos (maneja trailing commas)
 */
function processFurips2Line(
  fields: string[],
  numeroLote: number,
  usuario: string
): any {
  // Mínimo 7 campos para un registro válido (campos esenciales)
  // Aceptamos 9+ para manejar trailing commas
  if (fields.length < 7) {
    return null; // Retornar null si no tiene suficientes campos
  }

  // Safely get field value
  const f = (index: number) => (fields[index] || "").trim();

  return {
    Numero_factura: f(0).substring(0, 50) || null,
    Numero_consecutivo_de_la_reclamacion: f(1).substring(0, 50) || null,
    Tipo_de_servicio: f(2).substring(0, 50) || null,
    Codigo_del_servicio: f(3).substring(0, 50) || null,
    Descripcion_del_servicio_o_elemento_reclamado: f(4).substring(0, 300) || null,
    Cantidad_de_servicios: parseInt(f(5) || "0", 10) || null,
    Valor_unitario: toDecimal(f(6)),
    Valor_total_facturado: toDecimal(f(7)),
    Valor_total_reclamado: toDecimal(f(8)),
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
  if (fields.length < 44) {
    throw new Error(`Línea ${lineNumber}: Se esperan al menos 44 campos, se encontraron ${fields.length}`);
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
 * Procesa y guarda los datos de FURIPS1, FURIPS2 y FURTRAN en la base de datos PostgreSQL.
 * NO BORRA datos existentes - solo inserta nuevos registros (acumulativo).
 * numero_lote = MAX(control_lotes.id) + 1
 * usuario = 'admin' (por ahora)
 */
export async function processFuripsData(
  furips1Content: string,
  furips2Content: string,
  furtranContent: string | null,
  _numeroLoteIgnored: number, // Se ignora - se calcula desde control_lotes
  _usuarioIgnored: string,    // Se ignora - se usa 'admin'
  nombreIps?: string,
  codigoHabilitacion?: string,
  cantidadFacturas?: number,
  valorReclamado?: number,
  nombreEnvio?: string
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
    console.log("🔄 ====================================================");
    console.log("🔄 INICIANDO PROCESAMIENTO FURIPS (PostgreSQL - ACUMULATIVO)");
    console.log("🔄 ====================================================");
    console.log(`📄 furips1Content: ${furips1Content ? furips1Content.length + ' chars' : 'VACÍO/NULL'}`);
    console.log(`📄 furips2Content: ${furips2Content ? furips2Content.length + ' chars' : 'VACÍO/NULL'}`);
    console.log(`📄 furtranContent: ${furtranContent ? furtranContent.length + ' chars' : 'VACÍO/NULL'}`);

    // ==================== OBTENER NUMERO_LOTE DESDE control_lotes ====================
    let numeroLote: number;
    try {
      const maxIdResult = await prisma.$queryRaw<Array<{ max_id: number | null }>>`
        SELECT COALESCE(MAX(id), 0) as max_id FROM control_lotes
      `;
      const maxId = Number(maxIdResult[0]?.max_id || 0);
      numeroLote = maxId + 1;
      console.log(`🔢 numero_lote calculado: MAX(control_lotes.id)=${maxId} + 1 = ${numeroLote}`);
    } catch (err: any) {
      console.error("⚠️ Error obteniendo MAX(id) de control_lotes:", err.message);
      // Fallback: usar timestamp
      numeroLote = Math.floor(Date.now() / 1000);
      console.log(`🔢 numero_lote fallback (timestamp): ${numeroLote}`);
    }

    // Usuario fijo = 'admin'
    const usuario = "admin";
    console.log(`👤 Usuario: ${usuario}`);

    // ==================== ASEGURAR COLUMNAS NUEVAS EXISTAN ====================
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE furips1 ADD COLUMN IF NOT EXISTS verificado2103 BOOLEAN DEFAULT false`);
      await prisma.$executeRawUnsafe(`ALTER TABLE furips1 ADD COLUMN IF NOT EXISTS preauditoria BOOLEAN DEFAULT false`);
      await prisma.$executeRawUnsafe(`ALTER TABLE furips1 ADD COLUMN IF NOT EXISTS verificado2108 BOOLEAN DEFAULT false`);
      await prisma.$executeRawUnsafe(`ALTER TABLE furips1 ADD COLUMN IF NOT EXISTS verificado_soat BOOLEAN DEFAULT false`);
      await prisma.$executeRawUnsafe(`ALTER TABLE furips1 ADD COLUMN IF NOT EXISTS verificado_infopol BOOLEAN DEFAULT false`);
      console.log("✅ Columnas booleanas verificadas en furips1");
    } catch (colErr: any) {
      console.warn("⚠️ No se pudieron verificar columnas nuevas:", colErr.message);
    }

    // ==================== NO SE BORRA NADA - INSERCIONES ACUMULATIVAS ====================
    console.log("📌 MODO ACUMULATIVO: No se borran datos de furips1 ni furips2");

    // ==================== PROCESAR FURIPS1 (INSERT MASIVO) ====================
    if (furips1Content && furips1Content.trim() !== "") {
      console.log("📊 ======== PROCESANDO FURIPS1 ========");
      const lines = furips1Content.trim().split("\n").filter(line => line.trim() !== "");
      console.log(`📝 Líneas FURIPS1 encontradas: ${lines.length}`);
      
      // Log primeras 3 líneas para diagnóstico
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const sampleFields = lines[i].split(",");
        console.log(`📝 Línea ${i + 1}: ${sampleFields.length} campos | Preview: "${lines[i].substring(0, 120)}..."`);
      }
      
      // Preparar todos los registros
      const records: any[] = [];
      let skippedLines = 0;
      for (let i = 0; i < lines.length; i++) {
        const fields = lines[i].split(",");
        const record = processFurips1Line(fields, numeroLote, usuario);
        if (record) {
          records.push(record);
        } else {
          skippedLines++;
          if (skippedLines <= 5) {
            console.warn(`⚠️ Línea ${i + 1} omitida: ${fields.length} campos (mínimo 100 requeridos). Preview: "${lines[i].substring(0, 100)}..."`);
          }
        }
      }
      
      if (skippedLines > 5) {
        console.warn(`⚠️ ... y ${skippedLines - 5} líneas más omitidas en FURIPS1`);
      }
      
      console.log(`📊 Registros FURIPS1 válidos: ${records.length} de ${lines.length} líneas (${skippedLines} omitidas)`);
      
      // INSERT MASIVO en furips1 (una sola query)
      if (records.length > 0) {
        try {
          console.log(`📤 Insertando ${records.length} registros en furips1...`);
          const createResult = await prisma.furips1.createMany({
            data: records,
            skipDuplicates: true,
          });
          result.recordsProcessed.furips1 = createResult.count;
          console.log(`✅ FURIPS1: ${createResult.count} registros insertados exitosamente`);
        } catch (error: any) {
          console.error("❌ Error insertando FURIPS1:", error.message);
          if (error.message.includes("Unknown argument")) {
            console.error("❌ Posible campo no reconocido por Prisma. Verificar esquema.");
          }
          // Intentar insertar de a uno para identificar el registro problemático
          console.log("🔄 Intentando inserción individual para diagnosticar...");
          let successCount = 0;
          let errorCount = 0;
          for (let i = 0; i < Math.min(records.length, 5); i++) {
            try {
              await prisma.furips1.create({ data: records[i] });
              successCount++;
            } catch (singleErr: any) {
              errorCount++;
              console.error(`❌ Registro ${i + 1} falló: ${singleErr.message.substring(0, 200)}`);
              if (i === 0) {
                console.error(`❌ Datos del registro 1: ${JSON.stringify(records[0]).substring(0, 500)}`);
              }
            }
          }
          console.log(`🔍 Diagnóstico: ${successCount} exitosos, ${errorCount} fallidos de ${Math.min(records.length, 5)} intentados`);
          result.recordsProcessed.furips1 = successCount;
          if (successCount === 0) {
            throw error; // Re-throw if nothing worked
          }
        }

        // ==================== COPIAR A furips1_consolidado (best effort) ====================
        try {
          console.log("📋 Intentando copiar registros a furips1_consolidado...");
          // Verificar si la tabla existe
          const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'furips1_consolidado'
            ) as exists
          `;
          
          if (tableExists[0]?.exists) {
            const consolidadoResult = await prisma.$executeRawUnsafe(`
              INSERT INTO furips1_consolidado 
              SELECT * FROM furips1 WHERE numero_lote = ${numeroLote}
            `);
            console.log(`✅ ${consolidadoResult} registros copiados a furips1_consolidado`);
          } else {
            console.log("⚠️ Tabla furips1_consolidado no existe - omitiendo copia");
          }
        } catch (consError: any) {
          console.warn("⚠️ Error copiando a furips1_consolidado (no crítico):", consError.message);
        }
      } else {
        console.warn("⚠️ FURIPS1: 0 registros válidos - nada que insertar");
      }
    } else {
      console.warn("⚠️ FURIPS1: No hay contenido para procesar (vacío o nulo)");
      if (furips1Content === "") {
        console.warn("⚠️ furips1Content es string vacío ''");
      } else if (furips1Content === null || furips1Content === undefined) {
        console.warn("⚠️ furips1Content es null/undefined");
      }
    }

    // ==================== PROCESAR FURIPS2 (INSERT MASIVO) ====================
    if (furips2Content && furips2Content.trim() !== "") {
      console.log("📊 ======== PROCESANDO FURIPS2 ========");
      const lines = furips2Content.trim().split("\n").filter(line => line.trim() !== "");
      console.log(`📝 Líneas FURIPS2 encontradas: ${lines.length}`);
      
      // Log primeras 3 líneas para diagnóstico
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const sampleFields = lines[i].split(",");
        console.log(`📝 Línea ${i + 1}: ${sampleFields.length} campos | Preview: "${lines[i].substring(0, 120)}..."`);
      }
      
      // Preparar todos los registros
      const records: any[] = [];
      let skippedLines = 0;
      for (let i = 0; i < lines.length; i++) {
        const fields = lines[i].split(",");
        const record = processFurips2Line(fields, numeroLote, usuario);
        if (record) {
          records.push(record);
        } else {
          skippedLines++;
          if (skippedLines <= 5) {
            console.warn(`⚠️ Línea ${i + 1} FURIPS2 omitida: ${fields.length} campos (mínimo 7 requeridos). Preview: "${lines[i].substring(0, 100)}..."`);
          }
        }
      }
      
      if (skippedLines > 5) {
        console.warn(`⚠️ ... y ${skippedLines - 5} líneas FURIPS2 más omitidas`);
      }
      
      console.log(`📊 Registros FURIPS2 válidos: ${records.length} de ${lines.length} líneas (${skippedLines} omitidas)`);
      
      // INSERT MASIVO (una sola query)
      if (records.length > 0) {
        try {
          console.log(`📤 Insertando ${records.length} registros en furips2...`);
          const createResult = await prisma.furips2.createMany({
            data: records,
            skipDuplicates: true,
          });
          result.recordsProcessed.furips2 = createResult.count;
          console.log(`✅ FURIPS2: ${createResult.count} registros insertados exitosamente`);
        } catch (error: any) {
          console.error("❌ Error insertando FURIPS2:", error.message);
          // Intentar insertar de a uno para diagnosticar
          console.log("🔄 Intentando inserción individual FURIPS2...");
          let successCount = 0;
          for (let i = 0; i < Math.min(records.length, 5); i++) {
            try {
              await prisma.furips2.create({ data: records[i] });
              successCount++;
            } catch (singleErr: any) {
              console.error(`❌ Registro FURIPS2 ${i + 1} falló: ${singleErr.message.substring(0, 200)}`);
              if (i === 0) {
                console.error(`❌ Datos del registro 1: ${JSON.stringify(records[0]).substring(0, 500)}`);
              }
            }
          }
          result.recordsProcessed.furips2 = successCount;
          if (successCount === 0) throw error;
        }
      } else {
        console.warn("⚠️ FURIPS2: 0 registros válidos - nada que insertar");
      }
    } else {
      console.warn("⚠️ FURIPS2: No hay contenido para procesar (vacío o nulo)");
      if (furips2Content === "") {
        console.warn("⚠️ furips2Content es string vacío ''");
      } else if (furips2Content === null || furips2Content === undefined) {
        console.warn("⚠️ furips2Content es null/undefined");
      }
    }

    // ==================== PROCESAR FURTRAN (SOLO SI EXISTE) ====================
    if (furtranContent && furtranContent.trim() !== "") {
      console.log("📊 ======== PROCESANDO FURTRAN ========");
      const lines = furtranContent.trim().split("\n").filter(line => line.trim() !== "");
      console.log(`📝 Líneas FURTRAN encontradas: ${lines.length}`);
      
      for (let i = 0; i < lines.length; i++) {
        const fields = lines[i].split(",");
        try {
          const record = processFurtranLine(fields, i + 1, warnings);
          
          await prisma.$executeRaw`
            INSERT INTO "FURTRAN" (
              "Numero_radicado_anterior", "RGO_Respuesta_a_Glosa_u_objecion",
              "Numero_factura_o_documento_equivalente", "Codigo_habilitacion_prestador_servicios_salud",
              "Primer_apellido_reclamante", "Segundo_apellido_reclamante", "Primer_nombre_reclamante",
              "Segundo_nombre_reclamante", "Tipo_documento_identificacion_reclamante",
              "Numero_documento_identificacion_reclamante", "Tipo_Vehiculo_servicio_ambulancia",
              "Placa_vehiculo_traslado", "Direccion_reclamante", "Telefono_reclamante",
              "Codigo_departamento_residencia_reclamante", "Codigo_municipio_residencia_reclamante",
              "Tipo_documento_identidad_victima", "Numero_documento_identidad_victima",
              "Primer_nombre_victima", "Segundo_nombre_victima", "Primer_apellido_victima",
              "Segundo_apellido_victima", "Fecha_nacimiento_victima", "Sexo_victima",
              "Tipo_evento_movilizacion", "Direccion_recoge_victima", "Codigo_departamento_recoge_victima",
              "Codigo_municipio_recoge_victima", "Zona_recoge_victima", "Fecha_traslado_victima",
              "Hora_traslado_victima", "Codigo_habilitacion_IPS_recepcion",
              "Codigo_departamento_traslada_victima", "Codigo_municipio_traslada_victima",
              "Condicion_victima", "Estado_aseguramiento", "Tipo_Vehiculo", "Placa_Vehiculo_involucrado",
              "Codigo_aseguradora", "Numero_poliza_SOAT", "Fecha_inicio_vigencia_poliza",
              "Fecha_final_vigencia_poliza", "Numero_radicado_SIRAS", "Valor_facturado",
              "Valor_reclamado", "Manifestacion_servicios_habilitados"
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

    // ==================== INSERTAR EN control_lotes ====================
    if (nombreIps && codigoHabilitacion && nombreEnvio) {
      console.log("📋 Insertando registro en control_lotes...");
      
      try {
        // Calcular valor total desde FURIPS2 si no se proporciona
        let valorTotal = valorReclamado || 0;
        if (!valorTotal && result.recordsProcessed.furips2 > 0) {
          try {
            const valorResult = await prisma.$queryRaw<Array<{ total: number }>>`
              SELECT COALESCE(SUM(CAST("Valor_total_reclamado" AS DECIMAL(18,2))), 0) as total
              FROM furips2
              WHERE numero_lote = ${numeroLote}
            `;
            valorTotal = Number(valorResult[0]?.total || 0);
          } catch (e: any) {
            console.warn("⚠️ No se pudo calcular valor total desde furips2:", e.message);
          }
        }

        // Convertir valores a Decimal para PostgreSQL
        const cantidadFacturasDecimal = new Prisma.Decimal(cantidadFacturas || result.recordsProcessed.furips1 || 0);
        const valorTotalDecimal = new Prisma.Decimal(valorTotal || 0);
        
        await prisma.controlLote.upsert({
          where: { id: numeroLote },
          update: {
            numero_lote: numeroLote,
            fecha_creacion: new Date(),
            nombre_ips: nombreIps,
            codigo_habilitacion: codigoHabilitacion,
            cantidad_facturas: cantidadFacturasDecimal,
            valor_reclamado: valorTotalDecimal,
            nombre_envio: nombreEnvio,
            tipo_envio: "FURIPS",
          },
          create: {
            id: numeroLote,
            numero_lote: numeroLote,
            fecha_creacion: new Date(),
            nombre_ips: nombreIps,
            codigo_habilitacion: codigoHabilitacion,
            cantidad_facturas: cantidadFacturasDecimal,
            valor_reclamado: valorTotalDecimal,
            nombre_envio: nombreEnvio,
            tipo_envio: "FURIPS",
          },
        });
        
        console.log(`✅ Registro insertado en control_lotes: id=${numeroLote}, envio=${nombreEnvio}`);
      } catch (error: any) {
        console.error("⚠️ Error al insertar en control_lotes:", error.message);
        warnings.push({
          line: 0,
          field: "control_lotes",
          issue: `Error al insertar en control_lotes: ${error.message}`,
          originalValue: nombreEnvio || "",
          adjustedValue: "NO INSERTADO",
        });
      }
    }

    result.warnings = warnings;
    result.success = true;

    console.log("🔄 ====================================================");
    console.log("✅ PROCESAMIENTO COMPLETADO EXITOSAMENTE");
    console.log(`📊 FURIPS1: ${result.recordsProcessed.furips1} registros insertados`);
    console.log(`📊 FURIPS2: ${result.recordsProcessed.furips2} registros insertados`);
    console.log(`📊 FURTRAN: ${result.recordsProcessed.furtran} registros insertados`);
    console.log(`⚠️  Advertencias: ${warnings.length}`);
    console.log("🔄 ====================================================");

    return result;
  } catch (error: any) {
    console.error("❌ ====================================================");
    console.error("❌ ERROR CRÍTICO EN PROCESAMIENTO:", error.message);
    console.error("❌ Stack:", error.stack?.substring(0, 500));
    console.error("❌ ====================================================");
    result.error = error.message;
    result.warnings = warnings;
    return result;
  }
}
