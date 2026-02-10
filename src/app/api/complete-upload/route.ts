import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadMultipleFilesToR2, isR2Configured, notifyN8nWebhook } from "@/lib/cloudflare-r2";
import { processFuripsData } from "@/lib/furips-processor";

// maxDuration aumentado para Railway (30 minutos) - permite procesamiento de archivos pesados
export const maxDuration = 1800;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole === "ANALYST") {
      return NextResponse.json(
        { error: "Los analistas no pueden cargar archivos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      idEnvio,
      codigoHabilitacion,
      nombreIps,
      cantidadFacturas,
      cantidadItems,
      valorTotal,
      furtranCantidad,
      furtranValor,
      folderPath: initialFolderPath,
      uploadedFiles, // Array de keys que ya se subieron a R2
      // Contenido de archivos FURIPS (son pequeños, ~50KB cada uno)
      furips1Content,
      furips1Name,
      furips2Content,
      furips2Name,
      furtranContent,
      furtranName,
    } = body;

    // folderPath puede venir del body o ser actualizado después de subir archivos FURIPS
    let folderPath = initialFolderPath || "";

    if (!idEnvio || idEnvio.trim() === "") {
      return NextResponse.json(
        { error: "Se requiere el ID/Nombre del Envío" },
        { status: 400 }
      );
    }

    console.log(`📊 Procesando envío: ${idEnvio}`);
    console.log(`📁 Carpeta R2: ${folderPath}`);
    console.log(`📦 Archivos subidos: ${uploadedFiles?.length || 0}`);

    // Subir archivos FURIPS a R2 (son pequeños)
    if (isR2Configured() && furips1Content && furips2Content) {
      const filesToUpload: Array<{ buffer: Buffer; fileName: string; mimeType?: string }> = [];

      if (furips1Content && furips1Name) {
        filesToUpload.push({
          buffer: Buffer.from(furips1Content, "utf-8"),
          fileName: furips1Name,
          mimeType: "text/plain",
        });
      }

      if (furips2Content && furips2Name) {
        filesToUpload.push({
          buffer: Buffer.from(furips2Content, "utf-8"),
          fileName: furips2Name,
          mimeType: "text/plain",
        });
      }

      if (furtranContent && furtranName) {
        filesToUpload.push({
          buffer: Buffer.from(furtranContent, "utf-8"),
          fileName: furtranName,
          mimeType: "text/plain",
        });
      }

      if (filesToUpload.length > 0) {
        console.log(`📄 Subiendo ${filesToUpload.length} archivos FURIPS a R2...`);
        const r2Result = await uploadMultipleFilesToR2(filesToUpload, nombreIps, idEnvio);
        folderPath = r2Result.folderPath;
      }
    }

    // Guardar registro en BD
    const envio = await prisma.controlEnvioIps.create({
      data: {
        codigo_habilitacion: codigoHabilitacion,
        nombre_ips: nombreIps,
        nombre_archivo: idEnvio,
        cantidad_facturas: cantidadFacturas || 0,
        cantidad_items: cantidadItems || 0,
        valor_total: valorTotal || 0,
        ruta_drive: folderPath,
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

    // Procesar e insertar datos en FURIPS1, FURIPS2, FURTRAN
    console.log("📊 Iniciando procesamiento de datos...");
    
    let processResult = null;
    let dataInsertSuccess = false;
    
    try {
      processResult = await processFuripsData(
        furips1Content || "",
        furips2Content || "",
        furtranContent,
        envio.id, // Se ignora internamente - numero_lote se calcula desde control_lotes
        "admin",  // Usuario fijo por ahora
        nombreIps,
        codigoHabilitacion,
        cantidadFacturas,
        valorTotal,
        idEnvio
      );
      
      dataInsertSuccess = processResult.success;
      console.log("✅ Datos insertados exitosamente en la BD");
      console.log(`📊 FURIPS1: ${processResult.recordsProcessed.furips1} registros`);
      console.log(`📊 FURIPS2: ${processResult.recordsProcessed.furips2} registros`);
      console.log(`📊 FURTRAN: ${processResult.recordsProcessed.furtran} registros`);
    } catch (processError: any) {
      console.error("❌ Error al procesar datos:", processError);
      processResult = {
        success: false,
        warnings: [],
        recordsProcessed: { furips1: 0, furips2: 0, furtran: 0 },
        backupsCreated: { furips1: 0, furips2: 0, furtran: 0 },
        error: processError.message,
      };
    }

    return NextResponse.json({
      success: true,
      message: dataInsertSuccess 
        ? "Archivos cargados e insertados exitosamente en la base de datos"
        : "Archivos cargados exitosamente, pero hubo un problema al insertar los datos",
      data: {
        id: envio.id,
        idEnvio: envio.nombre_archivo,
        codigoHabilitacion: envio.codigo_habilitacion,
        nombreIps: envio.nombre_ips,
        cantidadFacturas: envio.cantidad_facturas,
        cantidadItems: envio.cantidad_items,
        valorTotal: Number(envio.valor_total),
        furtranCantidad,
        furtranValor,
        estado: envio.estado,
        fechaCarga: envio.fecha_carga,
        folderPath,
        uploadedFiles,
        storageConfigured: true,
        uploadSuccess: true,
        dataInsertSuccess,
        processResult,
      },
    });
  } catch (error: any) {
    console.error("❌ Error processing upload:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error?.message || "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
