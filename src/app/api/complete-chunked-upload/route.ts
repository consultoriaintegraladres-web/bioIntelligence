import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadMultipleFilesToR2, isR2Configured, notifyN8nWebhook } from "@/lib/cloudflare-r2";
import { processFuripsData } from "@/lib/furips-processor";
import { readFile, readdir, unlink, rmdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";

const TEMP_DIR = path.join(os.tmpdir(), "furips-uploads");

// Aumentar maxDuration para procesamiento de datos
export const maxDuration = 600; // 10 minutos

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
      uploadId,
      fileName,
      totalChunks,
      idEnvio,
      codigoHabilitacion,
      nombreIps,
      cantidadFacturas,
      cantidadItems,
      valorTotal,
      furtranCantidad,
      furtranValor,
      furips1Content,
      furips1Name,
      furips2Content,
      furips2Name,
      furtranContent,
      furtranName,
    } = body;

    if (!uploadId || !fileName || !idEnvio) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(TEMP_DIR, uploadId);
    
    if (!existsSync(uploadDir)) {
      return NextResponse.json(
        { error: "No se encontraron los chunks del archivo" },
        { status: 400 }
      );
    }

    console.log(`📦 Ensamblando ${totalChunks} chunks para ${fileName}...`);

    // Leer y ensamblar chunks
    const chunkFiles = await readdir(uploadDir);
    chunkFiles.sort(); // Ordenar para ensamblar en orden correcto

    const chunks: Buffer[] = [];
    for (const chunkFile of chunkFiles) {
      const chunkPath = path.join(uploadDir, chunkFile);
      const chunkData = await readFile(chunkPath);
      chunks.push(chunkData);
    }

    const fileBuffer = Buffer.concat(chunks);
    console.log(`✅ Archivo ensamblado: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

    // Limpiar chunks temporales
    for (const chunkFile of chunkFiles) {
      await unlink(path.join(uploadDir, chunkFile));
    }
    await rmdir(uploadDir);
    console.log(`🧹 Chunks temporales limpiados`);

    // Verificar R2
    if (!isR2Configured()) {
      return NextResponse.json({
        success: false,
        error: "Cloudflare R2 no está configurado",
      }, { status: 500 });
    }

    // Descomprimir ZIP y preparar archivos para subir
    console.log(`📦 Descomprimiendo ${fileName}...`);
    const zip = new AdmZip(fileBuffer);
    const zipEntries = zip.getEntries();
    
    // Preparar lista de archivos extraídos para subir
    const filesToUpload: Array<{ buffer: Buffer; fileName: string; mimeType?: string }> = [];
    let totalExtractedSize = 0;
    
    for (const entry of zipEntries) {
      // Ignorar directorios y archivos ocultos
      if (entry.isDirectory || entry.entryName.startsWith('.') || entry.entryName.includes('/__MACOSX')) {
        continue;
      }
      
      const entryData = entry.getData();
      totalExtractedSize += entryData.length;
      
      // Determinar mimeType basado en la extensión
      const ext = path.extname(entry.entryName).toLowerCase();
      let mimeType = "application/octet-stream";
      if (ext === ".pdf") mimeType = "application/pdf";
      else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
      else if (ext === ".png") mimeType = "image/png";
      else if (ext === ".xml") mimeType = "application/xml";
      else if (ext === ".txt") mimeType = "text/plain";
      else if (ext === ".json") mimeType = "application/json";
      
      // Usar solo el nombre del archivo, ignorar subdirectorios del ZIP
      const cleanFileName = path.basename(entry.entryName);
      
      filesToUpload.push({
        buffer: entryData,
        fileName: cleanFileName,
        mimeType,
      });
    }
    
    console.log(`✅ ZIP descomprimido: ${zipEntries.length} entradas, ${filesToUpload.length} archivos a subir (${(totalExtractedSize / (1024 * 1024)).toFixed(2)} MB total)`);

    // Agregar archivos FURIPS a la lista
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

    // Subir todos los archivos extraídos a R2
    console.log(`📤 Subiendo ${filesToUpload.length} archivos extraídos a R2...`);
    const uploadResult = await uploadMultipleFilesToR2(filesToUpload, nombreIps, idEnvio);
    console.log(`✅ ${uploadResult.files.length} archivos subidos a R2`);

    // Obtener folderPath
    const folderPath = uploadResult.folderPath;

    // Notificar al webhook de n8n después de subir todos los archivos extraídos
    const bucketName = process.env.R2_BUCKET_NAME;
    let webhookResponse = null;
    if (bucketName) {
      console.log(`📡 Notificando a n8n webhook sobre carpeta: ${folderPath}`);
      webhookResponse = await notifyN8nWebhook(bucketName, folderPath);
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

    // Procesar e insertar datos en FURIPS1, FURIPS2, FURTRAN
    console.log("📊 Iniciando procesamiento de datos...");
    
    let processResult = null;
    let dataInsertSuccess = false;
    
    try {
      processResult = await processFuripsData(
        furips1Content || "",
        furips2Content || "",
        furtranContent,
        envio.id,
        session.user?.email || "unknown"
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
        uploadedFiles: uploadResult.files.map(f => f.key),
        totalFilesExtracted: filesToUpload.length,
        storageConfigured: true,
        uploadSuccess: true,
        webhookNotified: !!webhookResponse,
        webhookResponse,
        dataInsertSuccess,
        processResult,
      },
    });
  } catch (error: any) {
    console.error("❌ Error al completar upload:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error?.message || "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
