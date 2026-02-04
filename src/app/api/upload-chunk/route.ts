import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir, unlink, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";

// Directorio temporal para chunks
const TEMP_DIR = path.join(os.tmpdir(), "furips-uploads");

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const chunk = formData.get("chunk") as Blob | null;
    const chunkIndex = parseInt(formData.get("chunkIndex") as string, 10);
    const totalChunks = parseInt(formData.get("totalChunks") as string, 10);
    const fileName = formData.get("fileName") as string;
    const uploadId = formData.get("uploadId") as string;

    if (!chunk || isNaN(chunkIndex) || isNaN(totalChunks) || !fileName || !uploadId) {
      return NextResponse.json(
        { error: "Datos de chunk incompletos" },
        { status: 400 }
      );
    }

    // Crear directorio temporal si no existe
    const uploadDir = path.join(TEMP_DIR, uploadId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Guardar chunk
    const chunkPath = path.join(uploadDir, `chunk_${chunkIndex.toString().padStart(5, '0')}`);
    const buffer = Buffer.from(await chunk.arrayBuffer());
    await writeFile(chunkPath, buffer);

    console.log(`📦 Chunk ${chunkIndex + 1}/${totalChunks} guardado para ${fileName}`);

    return NextResponse.json({
      success: true,
      chunkIndex,
      totalChunks,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} recibido`,
    });
  } catch (error: any) {
    console.error("Error al guardar chunk:", error);
    return NextResponse.json(
      { error: "Error al procesar chunk", details: error?.message },
      { status: 500 }
    );
  }
}
