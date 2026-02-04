import { prisma } from "../src/lib/prisma.js";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🔄 Ejecutando migraciones FURIPS...");

  try {
    // Leer el script SQL
    const sqlPath = path.join(__dirname, "../prisma/migrations/add_furips_ids_and_backups.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    // Dividir en sentencias individuales
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`📝 Ejecutando ${statements.length} sentencias SQL...`);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`  ➤ ${statement.substring(0, 80)}...`);
        await prisma.$executeRawUnsafe(statement);
      }
    }

    console.log("✅ Migraciones ejecutadas exitosamente");
  } catch (error) {
    console.error("❌ Error ejecutando migraciones:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
