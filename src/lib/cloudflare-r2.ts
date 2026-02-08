import { 
  S3Client, 
  PutObjectCommand, 
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Configuración de Cloudflare R2 (S3-compatible)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Webhook de n8n para notificar uploads
const N8N_WEBHOOK_URL = "https://validacionesbio.app.n8n.cloud/webhook/r2-upload";

/**
 * Notifica al webhook de n8n cuando archivos se suben exitosamente a R2
 * @param bucket - Nombre del bucket de R2
 * @param filePath - Ruta completa (Key) del archivo o carpeta dentro del bucket
 * @returns Respuesta del webhook o null si falla
 */
export async function notifyN8nWebhook(bucket: string, filePath: string): Promise<any> {
  try {
    console.log(`📡 Notificando a n8n webhook: ${filePath}`);
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucket: bucket,
        file_path: filePath,
      }),
    });

    if (!response.ok) {
      console.error(`⚠️ Webhook n8n respondió con error: ${response.status} ${response.statusText}`);
      return null;
    }

    const result = await response.json().catch(() => ({ success: true }));
    console.log(`✅ Webhook n8n notificado exitosamente para: ${filePath}`);
    return result;
  } catch (error: any) {
    console.error(`❌ Error al notificar webhook n8n: ${error?.message}`);
    // No lanzamos el error para no afectar el flujo principal
    return null;
  }
}

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID || R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || R2_SECRET_ACCESS_KEY;
  
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 credentials not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in .env"
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });
}

// Sanitizar nombre para usar como carpeta
function sanitizeFolderName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remover acentos
    .replace(/[^a-zA-Z0-9_\-\.]/g, "_") // Reemplazar caracteres especiales
    .replace(/_+/g, "_") // Evitar múltiples guiones bajos
    .substring(0, 100); // Limitar longitud
}

// Obtener fecha en formato YYYY-MM-DD
function getDateString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

// Tamaño mínimo para usar multipart upload (100 MB)
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100 MB
// Tamaño de cada parte en multipart upload (10 MB)
const PART_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Sube un archivo usando multipart upload para archivos grandes
 */
async function uploadLargeFileMultipart(
  client: S3Client,
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<void> {
  const bucketName = process.env.R2_BUCKET_NAME || R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("R2_BUCKET_NAME not configured in .env");
  }
  
  // Crear multipart upload
  const createCommand = new CreateMultipartUploadCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: mimeType,
  });

  const { UploadId } = await client.send(createCommand);
  if (!UploadId) {
    throw new Error("No se pudo crear el multipart upload");
  }

  const parts: Array<{ ETag: string; PartNumber: number }> = [];
  const totalParts = Math.ceil(buffer.length / PART_SIZE);

  try {
    // Subir cada parte
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, buffer.length);
      const partBuffer = buffer.slice(start, end);

      const uploadCommand = new UploadPartCommand({
        Bucket: bucketName,
        Key: key,
        PartNumber: partNumber,
        UploadId,
        Body: partBuffer,
      });

      const { ETag } = await client.send(uploadCommand);
      if (!ETag) {
        throw new Error(`No se recibió ETag para la parte ${partNumber}`);
      }

      parts.push({ ETag, PartNumber: partNumber });

      // Log progreso cada 10 partes
      if (partNumber % 10 === 0 || partNumber === totalParts) {
        console.log(`📤 Progreso multipart: ${partNumber}/${totalParts} partes (${((partNumber / totalParts) * 100).toFixed(1)}%)`);
      }
    }

    // Completar multipart upload
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      UploadId,
      MultipartUpload: { Parts: parts },
    });

    await client.send(completeCommand);
    console.log(`✅ Multipart upload completado: ${key}`);
  } catch (error) {
      // Abortar multipart upload en caso de error
    try {
      const abortCommand = new AbortMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        UploadId,
      });
      await client.send(abortCommand);
    } catch (abortError) {
      console.error("Error al abortar multipart upload:", abortError);
    }
    throw error;
  }
}

/**
 * Sube un archivo a R2 en una estructura de carpetas organizada
 * Estructura: {nombreIps}/{fecha}_{idEnvio}/{nombreArchivo}
 * Usa multipart upload automáticamente para archivos grandes (>100MB)
 */
export async function uploadFileToR2Organized(
  fileBuffer: Buffer,
  fileName: string,
  nombreIps: string,
  idEnvio: string,
  mimeType: string = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const bucketName = process.env.R2_BUCKET_NAME || R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("R2_BUCKET_NAME not configured in .env");
  }

  const client = getR2Client();
  
  // Crear estructura de carpetas
  const ipsFolderName = sanitizeFolderName(nombreIps);
  const dateStr = getDateString();
  const envioFolderName = sanitizeFolderName(idEnvio);
  
  // Estructura: nombreIps/fecha_idEnvio/archivo
  const key = `${ipsFolderName}/${dateStr}_${envioFolderName}/${fileName}`;

  const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);
  console.log(`🔄 Subiendo archivo a R2: ${key} (${fileSizeMB} MB)`);

  // Usar multipart upload para archivos grandes
  if (fileBuffer.length > MULTIPART_THRESHOLD) {
    console.log(`📦 Usando multipart upload para archivo grande (${fileSizeMB} MB)`);
    await uploadLargeFileMultipart(client, fileBuffer, key, mimeType);
  } else {
    // Upload simple para archivos pequeños
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await client.send(command);
  }

  const accountId = process.env.R2_ACCOUNT_ID || R2_ACCOUNT_ID;
  const url = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`;

  console.log(`✅ Archivo subido exitosamente a R2: ${key}`);

  return {
    key,
    url,
  };
}

/**
 * Sube múltiples archivos a la misma carpeta de envío
 * Procesa archivos en paralelo para mejor rendimiento
 */
export async function uploadMultipleFilesToR2(
  files: Array<{ buffer: Buffer; fileName: string; mimeType?: string }>,
  nombreIps: string,
  idEnvio: string
): Promise<{ folderPath: string; files: Array<{ key: string; url: string }> }> {
  const ipsFolderName = sanitizeFolderName(nombreIps);
  const dateStr = getDateString();
  const envioFolderName = sanitizeFolderName(idEnvio);
  const folderPath = `${ipsFolderName}/${dateStr}_${envioFolderName}`;

  console.log(`📦 Subiendo ${files.length} archivos a ${folderPath}`);

  // Subir archivos en paralelo (máximo 3 a la vez para evitar sobrecarga)
  const results: Array<{ key: string; url: string }> = [];
  const uploadPromises: Promise<{ key: string; url: string }>[] = [];

  for (const file of files) {
    const uploadPromise = uploadFileToR2Organized(
      file.buffer,
      file.fileName,
      nombreIps,
      idEnvio,
      file.mimeType || "application/octet-stream"
    );
    uploadPromises.push(uploadPromise);
  }

  // Esperar todas las subidas
  const uploadedResults = await Promise.all(uploadPromises);
  results.push(...uploadedResults);

  console.log(`✅ Todos los archivos subidos exitosamente (${results.length} archivos)`);

  return {
    folderPath,
    files: results,
  };
}

// Mantener función legacy para compatibilidad
export async function uploadFileToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = "application/zip"
): Promise<{ key: string; url: string }> {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME not configured in .env");
  }

  const client = getR2Client();
  const timestamp = Date.now();
  const key = `uploads/${timestamp}_${fileName}`;

  console.log(`🔄 Subiendo archivo a R2: ${key}`);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await client.send(command);

  const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;

  console.log(`✅ Archivo subido exitosamente a R2: ${key}`);

  return {
    key,
    url,
  };
}

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

/**
 * Genera una presigned URL para subir un archivo directamente a R2
 * Esta URL permite al cliente subir sin pasar por el servidor Next.js
 */
export async function getPresignedUploadUrl(
  fileName: string,
  nombreIps: string,
  idEnvio: string,
  mimeType: string = "application/octet-stream",
  expiresIn: number = 3600 // 1 hora por defecto
): Promise<{ uploadUrl: string; key: string; folderPath: string }> {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME not configured in .env");
  }

  const client = getR2Client();
  
  // Crear estructura de carpetas
  const ipsFolderName = sanitizeFolderName(nombreIps);
  const dateStr = getDateString();
  const envioFolderName = sanitizeFolderName(idEnvio);
  const folderPath = `${ipsFolderName}/${dateStr}_${envioFolderName}`;
  
  // Estructura: nombreIps/fecha_idEnvio/archivo
  const key = `${folderPath}/${fileName}`;

  console.log(`🔑 Generando presigned URL para: ${key}`);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  console.log(`✅ Presigned URL generada para: ${key}`);

  return {
    uploadUrl,
    key,
    folderPath,
  };
}

/**
 * Genera múltiples presigned URLs para subir varios archivos
 */
export async function getMultiplePresignedUrls(
  files: Array<{ fileName: string; mimeType?: string }>,
  nombreIps: string,
  idEnvio: string,
  expiresIn: number = 3600
): Promise<{ 
  folderPath: string; 
  urls: Array<{ fileName: string; uploadUrl: string; key: string }> 
}> {
  const ipsFolderName = sanitizeFolderName(nombreIps);
  const dateStr = getDateString();
  const envioFolderName = sanitizeFolderName(idEnvio);
  const folderPath = `${ipsFolderName}/${dateStr}_${envioFolderName}`;

  const urls: Array<{ fileName: string; uploadUrl: string; key: string }> = [];

  for (const file of files) {
    const result = await getPresignedUploadUrl(
      file.fileName,
      nombreIps,
      idEnvio,
      file.mimeType || "application/octet-stream",
      expiresIn
    );
    urls.push({
      fileName: file.fileName,
      uploadUrl: result.uploadUrl,
      key: result.key,
    });
  }

  return { folderPath, urls };
}
