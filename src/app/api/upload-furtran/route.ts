import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFileToR2Organized, isR2Configured, notifyN8nWebhook } from "@/lib/cloudflare-r2";

const FURTRAN_EXPECTED_FIELDS = 46;

interface ValidationError {
  line: number;
  expectedFields: number;
  actualFields: number;
  preview: string;
}

function validateFurtranFile(content: string): {
  isValid: boolean;
  errors: ValidationError[];
  totalLines: number;
  validLines: number;
} {
  const lines = content.trim().split("\n").filter(line => line.trim() !== "");
  const errors: ValidationError[] = [];
  let validLines = 0;

  lines.forEach((line, index) => {
    const fields = line.split(",");
    const fieldCount = fields.length;

    if (fieldCount !== FURTRAN_EXPECTED_FIELDS) {
      errors.push({
        line: index + 1,
        expectedFields: FURTRAN_EXPECTED_FIELDS,
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

function processFurtran(content: string): { 
  cantidadRegistros: number; 
  valorTotal: number;
  codigoHabilitacion: string;
} {
  const lines = content.trim().split("\n").filter(line => line.trim() !== "");
  let valorTotal = 0;
  let codigoHabilitacion = "";

  lines.forEach((line, index) => {
    const fields = line.split(",");
    
    // Primera línea: obtener código de habilitación (asumiendo campo 5)
    if (index === 0 && fields.length >= 5) {
      codigoHabilitacion = (fields[4] || "").substring(0, 10);
    }
    
    // El valor está en el campo 45 (índice 44)
    if (fields.length >= 45) {
      const valor = parseFloat(fields[44]) || 0;
      valorTotal += valor;
    }
  });

  return {
    cantidadRegistros: lines.length,
    valorTotal,
    codigoHabilitacion,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole === "ANALYST" || userRole === "COORDINADOR") {
      return NextResponse.json(
        { error: userRole === "COORDINADOR" ? "Los coordinadores no pueden cargar archivos" : "Los analistas no pueden cargar archivos" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const furtranFile = formData.get("furtran") as File | null;
    const idEnvio = formData.get("idEnvio") as string | null;

    if (!furtranFile) {
      return NextResponse.json(
        { error: "Se requiere el archivo FURTRAN" },
        { status: 400 }
      );
    }

    if (!idEnvio || idEnvio.trim() === "") {
      return NextResponse.json(
        { error: "Se requiere el ID/Nombre del Envío" },
        { status: 400 }
      );
    }

    const furtranContent = await furtranFile.text();
    const validation = validateFurtranFile(furtranContent);

    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        message: "El archivo FURTRAN contiene errores de formato",
        validation: {
          fileName: furtranFile.name,
          ...validation,
        },
      });
    }

    const furtranData = processFurtran(furtranContent);

    // Obtener nombre de IPS
    const userCodigoHabilitacion = (session.user as any).codigoHabilitacion;
    const codigoHab = furtranData.codigoHabilitacion || userCodigoHabilitacion;

    const ipsResult = await prisma.$queryRaw<{ nombre_ips: string }[]>`
      SELECT DISTINCT nombre_ips 
      FROM control_lotes 
      WHERE SUBSTRING(codigo_habilitación, 1, 10) = ${codigoHab}
      LIMIT 1
    `;

    const nombreIps = ipsResult[0]?.nombre_ips || session.user?.name || "IPS";

    // Verificar si el envío ya existe para hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingEnvio = await prisma.controlEnvioIps.findFirst({
      where: {
        codigo_habilitacion: codigoHab,
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
          error: `El envío "${idEnvio}" ya existe para el día de hoy.`,
        },
        { status: 400 }
      );
    }

    // Subir a R2 si está configurado
    let rutaStorage = "";
    let folderPath = "";
    if (isR2Configured()) {
      try {
        const fileBuffer = Buffer.from(furtranContent, "utf-8");
        const r2Result = await uploadFileToR2Organized(
          fileBuffer,
          furtranFile.name,
          nombreIps,
          idEnvio,
          "text/plain"
        );
        rutaStorage = r2Result.url;
        // Extraer folderPath del key (nombreIps/fecha_idEnvio/archivo -> nombreIps/fecha_idEnvio)
        const keyParts = r2Result.key.split("/");
        folderPath = keyParts.slice(0, -1).join("/");
        console.log("✅ FURTRAN subido a R2:", r2Result.key);
      } catch (err: any) {
        console.error("❌ Error uploading FURTRAN to R2:", err.message);
      }
    }

    // Guardar en BD
    const envio = await prisma.controlEnvioIps.create({
      data: {
        codigo_habilitacion: codigoHab,
        nombre_ips: nombreIps,
        nombre_archivo: `FURTRAN_${idEnvio}`,
        cantidad_facturas: 0,
        cantidad_items: furtranData.cantidadRegistros,
        valor_total: furtranData.valorTotal,
        ruta_drive: rutaStorage,
        estado: "EN_PROCESO",
      },
    });

    console.log("✅ Registro guardado en BD:", envio.id);

    // Notificar al webhook de n8n después de crear el envío exitosamente
    if (isR2Configured() && folderPath) {
      const bucketName = process.env.R2_BUCKET_NAME;
      if (bucketName) {
        console.log(`📡 Notificando a n8n webhook sobre carpeta: ${folderPath}`);
        await notifyN8nWebhook(bucketName, folderPath).catch((err) => {
          console.error("⚠️ Error al notificar webhook n8n:", err?.message);
          // No fallar el proceso si el webhook falla
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Archivo FURTRAN cargado exitosamente",
      data: {
        id: envio.id,
        idEnvio,
        codigoHabilitacion: codigoHab,
        nombreIps,
        cantidadRegistros: furtranData.cantidadRegistros,
        valorTotal: furtranData.valorTotal,
        rutaStorage,
        validation: {
          fileName: furtranFile.name,
          totalLines: validation.totalLines,
          validLines: validation.validLines,
          isValid: true,
        },
      },
    });
  } catch (error) {
    console.error("Error processing FURTRAN:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
