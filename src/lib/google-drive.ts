import { google } from "googleapis";
import { Readable } from "stream";

// Configuración de Google Drive usando Service Account
// Usamos scope más amplio para permitir acceso a carpetas compartidas
const SCOPES = ["https://www.googleapis.com/auth/drive"];

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error(
      "Google Drive credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env"
    );
  }

  // Reemplazar los \n literales por saltos de línea reales
  privateKey = privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });

  return auth;
}

export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = "application/zip"
): Promise<{ fileId: string; webViewLink: string }> {
  const auth = getAuthClient();
  const drive = google.drive({ version: "v3", auth });

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error(
      "Google Drive folder ID not configured. Please set GOOGLE_DRIVE_FOLDER_ID in .env"
    );
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/660cc560-af41-44a9-be17-cf7d8435b0ac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-drive.ts:47',message:'Iniciando upload a Drive',data:{fileName,folderId,bufferSize:fileBuffer.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A-drive-upload'})}).catch(()=>{});
  // #endregion

  try {
    // Crear el archivo en Drive con soporte para carpetas compartidas
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: Readable.from(fileBuffer),
      },
      fields: "id, webViewLink",
      supportsAllDrives: true, // Soporte para Shared Drives y carpetas compartidas
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/660cc560-af41-44a9-be17-cf7d8435b0ac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-drive.ts:65',message:'Upload exitoso',data:{fileId:response.data.id,webViewLink:response.data.webViewLink},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A-drive-upload'})}).catch(()=>{});
    // #endregion

    if (!response.data.id) {
      throw new Error("Failed to upload file to Google Drive");
    }

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink || "",
    };
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/660cc560-af41-44a9-be17-cf7d8435b0ac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-drive.ts:78',message:'Error en upload',data:{errorMessage:error.message,errorCode:error.code,errorStatus:error.status,errors:error.errors},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A-drive-upload'})}).catch(()=>{});
    // #endregion
    throw error;
  }
}

export async function checkDriveConnection(): Promise<boolean> {
  try {
    const auth = getAuthClient();
    const drive = google.drive({ version: "v3", auth });

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) return false;

    // Verificar acceso a la carpeta
    await drive.files.get({
      fileId: folderId,
      fields: "id, name",
    });

    return true;
  } catch (error) {
    console.error("Google Drive connection error:", error);
    return false;
  }
}

export function isDriveConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_DRIVE_FOLDER_ID
  );
}
