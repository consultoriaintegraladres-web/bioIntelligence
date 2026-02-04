import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Constantes de validación
const FURIPS1_EXPECTED_FIELDS = 102;
const FURIPS2_EXPECTED_FIELDS = 9;
const FURTRAN_EXPECTED_FIELDS = 46;

// Mapeo de Estado de Aseguramiento (Campo 28, índice 27)
const ESTADO_ASEGURAMIENTO: Record<string, string> = {
  "1": "Asegurado",
  "2": "No asegurado",
  "3": "Vehículo fantasma",
  "4": "Póliza falsa",
  "5": "Vehículo en fuga",
  "6": "Asegurado D.2497",
  "7": "No asegurado Propietario Indeterminado",
  "8": "No Asegurado - Sin Placa",
};

// Mapeo de Condición de Víctima (Campo 19, índice 18)
const CONDICION_VICTIMA: Record<string, string> = {
  "1": "Conductor",
  "2": "Peatón",
  "3": "Ocupante",
  "4": "Ciclista",
};

// Mapeo de Tipo de Servicio FURIPS2 (Campo 3, índice 2)
const TIPO_SERVICIO: Record<string, string> = {
  "1": "1-Medicamentos",
  "2": "2-Procedimientos",
  "3": "3-Transporte Primario",
  "4": "4-Transporte Secundario",
  "5": "5-Insumos",
  "6": "6-Dispositivos Médicos",
  "7": "7-Material de Osteosintesis",
  "8": "8-Procedimientos Art 87",
};

interface ResumenItem {
  codigo: string;
  descripcion: string;
  cantidad: number;
  valor: number;
  porcentaje: number;
}

interface ValidationError {
  line: number;
  expectedFields: number;
  actualFields: number;
  preview: string;
}

interface FuripsValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  totalLines: number;
  validLines: number;
}

interface ProcessedData {
  codigoHabilitacion: string;
  nombreIps: string;
  cantidadFacturas: number;
  cantidadItems: number;
  valorTotal: number;
}

function validateFuripsFile(
  content: string,
  expectedFields: number
): FuripsValidationResult {
  const lines = content.trim().split("\n").filter(line => line.trim() !== "");
  const errors: ValidationError[] = [];
  let validLines = 0;

  lines.forEach((line, index) => {
    // Contar campos separados por coma
    const fields = line.split(",");
    const fieldCount = fields.length;

    if (fieldCount !== expectedFields) {
      errors.push({
        line: index + 1,
        expectedFields,
        actualFields: fieldCount,
        preview: line.substring(0, 100) + (line.length > 100 ? "..." : ""),
      });
    } else {
      validLines++;
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    totalLines: lines.length,
    validLines,
  };
}

function processFurips1(content: string): { 
  codigoHabilitacion: string; 
  cantidadFacturas: number;
  resumenEstadoAseguramiento: ResumenItem[];
  resumenCondicionVictima: ResumenItem[];
} {
  const lines = content.trim().split("\n").filter(line => line.trim() !== "");
  let codigoHabilitacion = "";

  // Contadores para resúmenes
  const estadoAseguramientoCount: Record<string, number> = {};
  const condicionVictimaCount: Record<string, number> = {};

  lines.forEach((line, index) => {
    const fields = line.split(",");
    
    // Primera línea: obtener código de habilitación
    if (index === 0 && fields.length >= 5) {
      codigoHabilitacion = (fields[4] || "").substring(0, 10);
    }

    // Campo 28 (índice 27) - Estado de Aseguramiento
    if (fields.length >= 28) {
      const estadoCode = (fields[27] || "").trim();
      if (estadoCode) {
        estadoAseguramientoCount[estadoCode] = (estadoAseguramientoCount[estadoCode] || 0) + 1;
      }
    }

    // Campo 19 (índice 18) - Condición de Víctima
    if (fields.length >= 19) {
      const condicionCode = (fields[18] || "").trim();
      if (condicionCode) {
        condicionVictimaCount[condicionCode] = (condicionVictimaCount[condicionCode] || 0) + 1;
      }
    }
  });

  const totalFacturas = lines.length;

  // Generar resumen de Estado de Aseguramiento
  const resumenEstadoAseguramiento: ResumenItem[] = Object.entries(estadoAseguramientoCount)
    .map(([codigo, cantidad]) => ({
      codigo,
      descripcion: ESTADO_ASEGURAMIENTO[codigo] || `Código ${codigo}`,
      cantidad,
      valor: 0, // No hay valor en FURIPS1 por registro
      porcentaje: totalFacturas > 0 ? (cantidad / totalFacturas) * 100 : 0,
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  // Generar resumen de Condición de Víctima
  const resumenCondicionVictima: ResumenItem[] = Object.entries(condicionVictimaCount)
    .map(([codigo, cantidad]) => ({
      codigo,
      descripcion: CONDICION_VICTIMA[codigo] || `Código ${codigo}`,
      cantidad,
      valor: 0,
      porcentaje: totalFacturas > 0 ? (cantidad / totalFacturas) * 100 : 0,
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  return {
    codigoHabilitacion,
    cantidadFacturas: totalFacturas,
    resumenEstadoAseguramiento,
    resumenCondicionVictima,
  };
}

function processFurips2(content: string): { 
  cantidadItems: number; 
  valorTotal: number;
  resumenTipoServicio: ResumenItem[];
} {
  const lines = content.trim().split("\n").filter(line => line.trim() !== "");
  let valorTotal = 0;

  // Contadores para resumen por tipo de servicio
  const tipoServicioData: Record<string, { cantidad: number; valor: number }> = {};

  lines.forEach(line => {
    const fields = line.split(",");
    if (fields.length >= 9) {
      const valor = parseFloat(fields[8]) || 0;
      valorTotal += valor;

      // Campo 3 (índice 2) - Tipo de Servicio
      const tipoCode = (fields[2] || "").trim();
      if (tipoCode) {
        if (!tipoServicioData[tipoCode]) {
          tipoServicioData[tipoCode] = { cantidad: 0, valor: 0 };
        }
        tipoServicioData[tipoCode].cantidad += 1;
        tipoServicioData[tipoCode].valor += valor;
      }
    }
  });

  const totalItems = lines.length;

  // Generar resumen de Tipo de Servicio
  const resumenTipoServicio: ResumenItem[] = Object.entries(tipoServicioData)
    .map(([codigo, data]) => ({
      codigo,
      descripcion: TIPO_SERVICIO[codigo] || `Tipo ${codigo}`,
      cantidad: data.cantidad,
      valor: data.valor,
      porcentaje: valorTotal > 0 ? (data.valor / valorTotal) * 100 : 0,
    }))
    .sort((a, b) => b.valor - a.valor);

  return {
    cantidadItems: totalItems,
    valorTotal,
    resumenTipoServicio,
  };
}

function processFurtran(content: string): { 
  cantidadRegistros: number; 
  valorTotal: number;
} {
  const lines = content.trim().split("\n").filter(line => line.trim() !== "");
  let valorTotal = 0;

  lines.forEach(line => {
    const fields = line.split(",");
    // El valor está en el campo 45 (índice 44)
    if (fields.length >= 45) {
      const valor = parseFloat(fields[44]) || 0;
      valorTotal += valor;
    }
  });

  return {
    cantidadRegistros: lines.length,
    valorTotal,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo ADMIN e IPS pueden cargar archivos
    const userRole = (session.user as any).role;
    if (userRole === "ANALYST") {
      return NextResponse.json(
        { error: "Los analistas no pueden cargar archivos" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const furips1File = formData.get("furips1") as File | null;
    const furips2File = formData.get("furips2") as File | null;
    const furtranFile = formData.get("furtran") as File | null;
    const idEnvio = formData.get("idEnvio") as string | null;

    if (!furips1File || !furips2File) {
      return NextResponse.json(
        { error: "Se requieren ambos archivos FURIPS1 y FURIPS2" },
        { status: 400 }
      );
    }

    if (!idEnvio || idEnvio.trim() === "") {
      return NextResponse.json(
        { error: "Se requiere el ID/Nombre del Envío" },
        { status: 400 }
      );
    }

    // Leer contenido de los archivos
    const furips1Content = await furips1File.text();
    const furips2Content = await furips2File.text();
    const furtranContent = furtranFile ? await furtranFile.text() : null;

    // Validar FURIPS1 (102 campos)
    const furips1Validation = validateFuripsFile(furips1Content, FURIPS1_EXPECTED_FIELDS);
    
    // Validar FURIPS2 (9 campos)
    const furips2Validation = validateFuripsFile(furips2Content, FURIPS2_EXPECTED_FIELDS);

    // Validar FURTRAN si se proporciona (40 campos)
    let furtranValidation = null;
    let furtranData = null;
    if (furtranContent) {
      furtranValidation = validateFuripsFile(furtranContent, FURTRAN_EXPECTED_FIELDS);
      if (furtranValidation.isValid) {
        furtranData = processFurtran(furtranContent);
      }
    }

    // Si hay errores de validación, retornarlos
    const hasErrors = !furips1Validation.isValid || 
                      !furips2Validation.isValid || 
                      (furtranValidation && !furtranValidation.isValid);

    if (hasErrors) {
      return NextResponse.json({
        success: false,
        message: "Los archivos contienen errores de formato",
        validation: {
          furips1: {
            fileName: furips1File.name,
            ...furips1Validation,
          },
          furips2: {
            fileName: furips2File.name,
            ...furips2Validation,
          },
          ...(furtranValidation && {
            furtran: {
              fileName: furtranFile?.name || "",
              ...furtranValidation,
            },
          }),
        },
      });
    }

    // Procesar datos de los archivos
    const furips1Data = processFurips1(furips1Content);
    const furips2Data = processFurips2(furips2Content);

    // Verificar que el código de habilitación coincida con el usuario (para IPS)
    const userCodigoHabilitacion = (session.user as any).codigoHabilitacion;
    if (userRole === "USER" && furips1Data.codigoHabilitacion !== userCodigoHabilitacion) {
      return NextResponse.json(
        { 
          error: "El código de habilitación del archivo no coincide con su cuenta",
          archivoCodigoHab: furips1Data.codigoHabilitacion,
          usuarioCodigoHab: userCodigoHabilitacion,
        },
        { status: 403 }
      );
    }

    // Verificar si el idEnvio ya existe para hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingEnvio = await prisma.controlEnvioIps.findFirst({
      where: {
        codigo_habilitacion: furips1Data.codigoHabilitacion,
        nombre_archivo: idEnvio,
        fecha_carga: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (existingEnvio) {
      return NextResponse.json(
        { 
          error: `El envío "${idEnvio}" ya existe para el día de hoy. Por favor use un nombre diferente.`,
          existingEnvioId: existingEnvio.id,
        },
        { status: 400 }
      );
    }

    // Obtener nombre de IPS de la base de datos
    const ipsResult = await prisma.$queryRaw<{ nombre_ips: string }[]>`
      SELECT DISTINCT nombre_ips 
      FROM control_lotes 
      WHERE LEFT(codigo_habilitación, 10) = ${furips1Data.codigoHabilitacion}
      LIMIT 1
    `;

    const nombreIps = ipsResult[0]?.nombre_ips || session.user?.name || "IPS No encontrada";

    return NextResponse.json({
      success: true,
      message: "Archivos validados correctamente",
      data: {
        idEnvio,
        codigoHabilitacion: furips1Data.codigoHabilitacion,
        nombreIps,
        cantidadFacturas: furips1Data.cantidadFacturas,
        cantidadItems: furips2Data.cantidadItems,
        valorTotal: furips2Data.valorTotal,
        // Resúmenes de FURIPS1
        resumenEstadoAseguramiento: furips1Data.resumenEstadoAseguramiento,
        resumenCondicionVictima: furips1Data.resumenCondicionVictima,
        // Resumen de FURIPS2
        resumenTipoServicio: furips2Data.resumenTipoServicio,
        // FURTRAN data (si se proporcionó)
        furtran: furtranData ? {
          cantidadRegistros: furtranData.cantidadRegistros,
          valorTotal: furtranData.valorTotal,
          fileName: furtranFile?.name,
        } : null,
        validation: {
          furips1: {
            fileName: furips1File.name,
            totalLines: furips1Validation.totalLines,
            validLines: furips1Validation.validLines,
            isValid: true,
          },
          furips2: {
            fileName: furips2File.name,
            totalLines: furips2Validation.totalLines,
            validLines: furips2Validation.validLines,
            isValid: true,
          },
          ...(furtranValidation && {
            furtran: {
              fileName: furtranFile?.name || "",
              totalLines: furtranValidation.totalLines,
              validLines: furtranValidation.validLines,
              isValid: furtranValidation.isValid,
            },
          }),
        },
        // Contenido de los archivos para subir después
        filesContent: {
          furips1: { name: furips1File.name, content: furips1Content },
          furips2: { name: furips2File.name, content: furips2Content },
          furtran: furtranContent ? { name: furtranFile?.name, content: furtranContent } : null,
        },
      },
    });
  } catch (error) {
    console.error("Error processing FURIPS files:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
