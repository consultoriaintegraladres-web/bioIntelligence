/**
 * Script de prueba para subir un archivo a Cloudflare R2
 * Uso: npx tsx test-r2-upload.ts
 */

// Cargar variables de entorno desde .env.local
import { config } from "dotenv";
import { resolve } from "path";

// Cargar .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { uploadFileToR2Organized, isR2Configured } from "./src/lib/cloudflare-r2";
import * as fs from "fs";
import * as path from "path";

async function testR2Upload() {
  console.log("🧪 Iniciando prueba de upload a Cloudflare R2...\n");

  // Debug: mostrar variables configuradas (sin valores completos)
  console.log("🔍 Verificando variables de entorno:");
  console.log(`   R2_ACCOUNT_ID: ${process.env.R2_ACCOUNT_ID ? '✅ Configurado (' + process.env.R2_ACCOUNT_ID.substring(0, 8) + '...)' : '❌ No configurado'}`);
  console.log(`   R2_ACCESS_KEY_ID: ${process.env.R2_ACCESS_KEY_ID ? '✅ Configurado (' + process.env.R2_ACCESS_KEY_ID.substring(0, 8) + '...)' : '❌ No configurado'}`);
  console.log(`   R2_SECRET_ACCESS_KEY: ${process.env.R2_SECRET_ACCESS_KEY ? '✅ Configurado (' + process.env.R2_SECRET_ACCESS_KEY.substring(0, 8) + '...)' : '❌ No configurado'}`);
  console.log(`   R2_BUCKET_NAME: ${process.env.R2_BUCKET_NAME ? '✅ Configurado (' + process.env.R2_BUCKET_NAME + ')' : '❌ No configurado'}`);
  console.log("");

  // Verificar configuración
  if (!isR2Configured()) {
    console.error("❌ Error: Cloudflare R2 no está configurado correctamente");
    console.error("   Verifica que las siguientes variables estén en .env.local:");
    console.error("   - R2_ACCOUNT_ID");
    console.error("   - R2_ACCESS_KEY_ID");
    console.error("   - R2_SECRET_ACCESS_KEY");
    console.error("   - R2_BUCKET_NAME");
    console.error("\n💡 Tip: Asegúrate de que el archivo .env.local esté en la raíz del proyecto");
    process.exit(1);
  }

  console.log("✅ Configuración de R2 verificada\n");

  // Crear un archivo de prueba pequeño
  const testFileName = `test-upload-${Date.now()}.txt`;
  const testContent = `Archivo de prueba generado el ${new Date().toISOString()}\n\nEste es un archivo de prueba para verificar la conexión con Cloudflare R2.`;
  const testFilePath = path.join(process.cwd(), testFileName);

  try {
    // Escribir archivo temporal
    fs.writeFileSync(testFilePath, testContent, "utf-8");
    console.log(`📝 Archivo de prueba creado: ${testFileName}`);

    // Leer archivo como buffer
    const fileBuffer = fs.readFileSync(testFilePath);
    console.log(`📦 Tamaño del archivo: ${(fileBuffer.length / 1024).toFixed(2)} KB\n`);

    // Subir a R2
    console.log("🔄 Subiendo archivo a Cloudflare R2...");
    const result = await uploadFileToR2Organized(
      fileBuffer,
      testFileName,
      "IPS-Test",
      "test-envio",
      "text/plain"
    );

    console.log("\n✅ ¡Upload exitoso!");
    console.log(`📁 Key: ${result.key}`);
    console.log(`🔗 URL: ${result.url}\n`);

    // Limpiar archivo temporal
    fs.unlinkSync(testFilePath);
    console.log("🧹 Archivo temporal eliminado");

    console.log("\n✨ Prueba completada exitosamente!");
  } catch (error: any) {
    console.error("\n❌ Error durante la prueba:");
    console.error(error.message);
    
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }

    // Limpiar archivo temporal si existe
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    process.exit(1);
  }
}

// Ejecutar prueba
testR2Upload().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
