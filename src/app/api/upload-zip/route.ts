import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadMultipleFilesToR2, isR2Configured, notifyN8nWebhook } from "@/lib/cloudflare-r2";
import { processFuripsData } from "@/lib/furips-processor";
import AdmZip from "adm-zip";
import path from "path";

// maxDuration aumentado para Railway (30 minutos) - permite archivos ZIP pesados
export const maxDuration = 1800;

export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/660cc560-af41-44a9-be17-cf7d8435b0ac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-zip/route.ts:18',message:'BACKEND - Request recibido',data:{contentLength:request.headers.get('content-length'),contentType:request.headers.get('content-type')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'BACKEND-A'})}).catch(()=>{});
  // #endregion
  
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/660cc560-af41-44a9-be17-cf7d8435b0ac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-zip/route.ts:29',message:'BACKEND - Parseando formData',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'BACKEND-B'})}).catch(()=>{});
    // #endregion
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/660cc560-af41-44a9-be17-cf7d8435b0ac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-zip/route.ts:30',message:'API - Parseando formData',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'API-PARSE-START'})}).catch(()=>{});
    // #endregion
    
    let formData: FormData;
    try {
      console.log("📥 Parseando FormData del request...");
      formData = await request.formData();
      console.log(`✅ FormData parseado exitosamente (${Array.from(formData.entries()).length} entradas)`);
    } catch (parseError: any) {
      console.error("❌ Error al parsear FormData:", parseError);
      return NextResponse.json({
        success: false,
        error: `Error al recibir los archivos: ${parseError?.message || 'El archivo puede ser demasiado grande o estar corrupto'}`,
        details: parseError?.stack?.substring(0, 200),
      }, { status: 400 });
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/660cc560-af41-44a9-be17-cf7d8435b0ac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-zip/route.ts:36',message:'API - FormData parseado exitosamente',data:{entriesCount:Array.from(formData.entries()).length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'API-PARSE-END'})}).catch(()=>{});
    // #endregion
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/660cc560-af41-44a9-be17-cf7d8435b0ac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-zip/route.ts:36',message:'BACKEND - FormData parseado exitosamente',data:{entriesCount:Array.from(formData.entries()).length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'BACKEND-C'})}).catch(()=>{});
    // #endregion
    
    // Archivos
    const zipFile = formData.get("zipFile") as File | null;
    const furips1Content = formData.get("furips1Content") as string | null;
    const furips1Name = formData.get("furips1Name") as string | null;
    const furips2Content = formData.get("furips2Content") as string | null;
    const furips2Name = formData.get("furips2Name") as string | null;
    const furtranContent = formData.get("furtranContent") as string | null;
    const furtranName = formData.get("furtranName") as string | null;
    
    // Datos del envío
    const idEnvio = formData.get("idEnvio") as string;
    const codigoHabilitacion = formData.get("codigoHabilitacion") as string;
    const nombreIps = formData.get("nombreIps") as string;
    const cantidadFacturas = parseInt(formData.get("cantidadFacturas") as string, 10) || 0;
    const cantidadItems = parseInt(formData.get("cantidadItems") as string, 10) || 0;
    const valorTotal = parseFloat(formData.get("valorTotal") as string) || 0;
    const furtranCantidad = parseInt(formData.get("furtranCantidad") as string, 10) || 0;
    const furtranValor = parseFloat(formData.get("furtranValor") as string) || 0;

    if (!zipFile) {
      return NextResponse.json(
        { error: "Se requiere el archivo ZIP" },
        { status: 400 }
      );
    }

    if (!idEnvio || idEnvio.trim() === "") {
      return NextResponse.json(
        { error: "Se requiere el ID/Nombre del Envío" },
        { status: 400 }
      );
    }

    // Verificar que es un archivo ZIP
    if (!zipFile.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json(
        { error: "El archivo debe ser de formato .zip" },
        { status: 400 }
      );
    }

    // Verificar configuración de R2
    if (!isR2Configured()) {
      console.log("⚠️ Cloudflare R2 no está configurado");
      return NextResponse.json({
        success: false,
        error: "Los servidores de seguridad Bio no están configurados correctamente",
        storageConfigured: false,
      }, { status: 500 });
    }

    // Preparar archivos para subir
    const filesToUpload: Array<{ buffer: Buffer; fileName: string; mimeType?: string }> = [];

    // Agregar FURIPS1
    if (furips1Content && furips1Name) {
      filesToUpload.push({
        buffer: Buffer.from(furips1Content, "utf-8"),
        fileName: furips1Name,
        mimeType: "text/plain",
      });
    }

    // Agregar FURIPS2
    if (furips2Content && furips2Name) {
      filesToUpload.push({
        buffer: Buffer.from(furips2Content, "utf-8"),
        fileName: furips2Name,
        mimeType: "text/plain",
      });
    }

    // Agregar FURTRAN (si existe)
    if (furtranContent && furtranName) {
      filesToUpload.push({
        buffer: Buffer.from(furtranContent, "utf-8"),
        fileName: furtranName,
        mimeType: "text/plain",
      });
    }

    // Agregar ZIP - leer archivo completo y descomprimirlo
    const zipFileSize = zipFile.size;
    const zipFileSizeMB = zipFileSize / (1024 * 1024);
    console.log(`📦 Procesando archivo ZIP: ${zipFile.name} (${zipFileSizeMB.toFixed(2)} MB)`);
    
    let zipBuffer: Buffer;
    try {
      const startTime = Date.now();
      zipBuffer = Buffer.from(await zipFile.arrayBuffer());
      const readTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Archivo ZIP leído en memoria: ${(zipBuffer.length / (1024 * 1024)).toFixed(2)} MB (${readTime}s)`);
    } catch (error: any) {
      console.error("❌ Error al leer archivo ZIP:", error);
      return NextResponse.json({
        success: false,
        error: `Error al procesar archivo ZIP: ${error?.message || 'Error desconocido'}. El archivo puede ser demasiado grande o estar corrupto.`,
      }, { status: 500 });
    }
    
    // Descomprimir ZIP y agregar archivos extraídos
    try {
      console.log(`📦 Descomprimiendo ${zipFile.name}...`);
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();
      let totalExtractedSize = 0;
      let extractedCount = 0;
      
      for (const entry of zipEntries) {
        // Ignorar directorios y archivos ocultos
        if (entry.isDirectory || entry.entryName.startsWith('.') || entry.entryName.includes('/__MACOSX')) {
          continue;
        }
        
        const entryData = entry.getData();
        totalExtractedSize += entryData.length;
        extractedCount++;
        
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
      
      console.log(`✅ ZIP descomprimido: ${zipEntries.length} entradas, ${extractedCount} archivos extraídos (${(totalExtractedSize / (1024 * 1024)).toFixed(2)} MB total)`);
    } catch (error: any) {
      console.error("❌ Error al descomprimir ZIP:", error);
      return NextResponse.json({
        success: false,
        error: `Error al descomprimir archivo ZIP: ${error?.message || 'Error desconocido'}. El archivo puede estar corrupto.`,
      }, { status: 500 });
    }

    // Subir todos los archivos a R2
    let folderPath = "";
    let uploadedFiles: Array<{ key: string; url: string }> = [];

    try {
      console.log("🔄 Subiendo archivos a Cloudflare R2...");
      console.log("📂 IPS:", nombreIps);
      console.log("📁 ID Envío:", idEnvio);
      console.log("📦 Archivos a subir:", filesToUpload.length);

      const r2Result = await uploadMultipleFilesToR2(
        filesToUpload,
        nombreIps,
        idEnvio
      );

      folderPath = r2Result.folderPath;
      uploadedFiles = r2Result.files;

      console.log("✅ Archivos subidos exitosamente a R2");
      console.log("📁 Carpeta:", folderPath);
      
    } catch (err: any) {
      const errorMessage = err?.message || "Error desconocido";
      console.error("❌ Error uploading to R2:", errorMessage);
      
      return NextResponse.json({
        success: false,
        error: `Error al subir a servidores de seguridad Bio: ${errorMessage}`,
        storageConfigured: true,
      }, { status: 500 });
    }

    // Guardar registro en BD
    const envio = await prisma.controlEnvioIps.create({
      data: {
        codigo_habilitacion: codigoHabilitacion,
        nombre_ips: nombreIps,
        nombre_archivo: idEnvio,
        cantidad_facturas: cantidadFacturas,
        cantidad_items: cantidadItems,
        valor_total: valorTotal,
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

    // ====================
    // PROCESAR E INSERTAR DATOS EN FURIPS1, FURIPS2, FURTRAN
    // ====================
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
      
      if (processResult.warnings.length > 0) {
        console.warn(`⚠️ ${processResult.warnings.length} advertencias durante el procesamiento`);
      }
    } catch (processError: any) {
      console.error("❌ Error al procesar datos:", processError);
      // No fallar la operación completa si la inserción falla
      // pero registrar el error para el usuario
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
        uploadedFiles: uploadedFiles.map(f => f.key),
        storageConfigured: true,
        uploadSuccess: true,
        dataInsertSuccess,
        processResult,
      },
    });
  } catch (error: any) {
    console.error("❌ Error processing upload:", error);
    console.error("Stack:", error?.stack);
    
    // Mensajes de error más específicos
    let errorMessage = "Error interno del servidor";
    let statusCode = 500;
    
    if (error?.message?.includes("memory") || error?.message?.includes("allocation")) {
      errorMessage = "El archivo es demasiado grande para procesar. Por favor, intente con un archivo más pequeño o comprímalo más.";
      statusCode = 413; // Payload Too Large
    } else if (error?.message?.includes("timeout") || error?.code === "ETIMEDOUT") {
      errorMessage = "La operación tomó demasiado tiempo. Por favor, intente nuevamente.";
      statusCode = 504; // Gateway Timeout
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage, 
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error?.stack?.substring(0, 500) : undefined,
      },
      { status: statusCode }
    );
  }
}
