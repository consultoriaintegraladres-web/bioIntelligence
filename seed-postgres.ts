/**
 * Script para crear usuarios en PostgreSQL
 * Replica los usuarios del seed original
 * Uso: npx tsx seed-postgres.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de usuarios en PostgreSQL...\n");

  // ==================== CREAR ADMIN ====================
  const adminEmail = "admin@hallazgos-ips.com";
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("Admin123!", 12);
    
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        nombre: "Administrador",
        codigo_habilitacion: "0000000000",
        role: Role.ADMIN,
      },
    });
    
    console.log(`✅ Usuario admin creado: ${adminEmail} / Admin123!`);
  } else {
    console.log(`ℹ️ Usuario admin ya existe: ${adminEmail}`);
  }

  // ==================== CREAR ANALISTA ====================
  const analystEmail = "analista@hallazgos-ips.com";
  
  const existingAnalyst = await prisma.user.findUnique({
    where: { email: analystEmail },
  });

  if (!existingAnalyst) {
    const hashedPassword = await bcrypt.hash("Analista2026!", 12);
    
    await prisma.user.create({
      data: {
        email: analystEmail,
        password: hashedPassword,
        nombre: "Analista",
        codigo_habilitacion: "0000000000",
        role: Role.ANALYST,
      },
    });
    
    console.log(`✅ Usuario analista creado: ${analystEmail} / Analista2026!`);
  } else {
    console.log(`ℹ️ Usuario analista ya existe: ${analystEmail}`);
  }

  // ==================== CREAR USUARIO DE PRUEBA ====================
  const testUserEmail = "usuario@test.com";
  
  const existingTestUser = await prisma.user.findUnique({
    where: { email: testUserEmail },
  });

  if (!existingTestUser) {
    const hashedPassword = await bcrypt.hash("User123!", 12);
    
    await prisma.user.create({
      data: {
        email: testUserEmail,
        password: hashedPassword,
        nombre: "Usuario de Prueba",
        codigo_habilitacion: "1234567890",
        role: Role.USER,
      },
    });
    
    console.log(`✅ Usuario de prueba creado: ${testUserEmail} / User123!`);
  } else {
    console.log(`ℹ️ Usuario de prueba ya existe: ${testUserEmail}`);
  }

  // ==================== RESUMEN ====================
  console.log("\n" + "=".repeat(60));
  console.log("📊 RESUMEN DE USUARIOS CREADOS");
  console.log("=".repeat(60));
  console.log("\n🔐 ADMINISTRADOR:");
  console.log("   Email: admin@hallazgos-ips.com");
  console.log("   Password: Admin123!");
  console.log("\n📊 ANALISTA:");
  console.log("   Email: analista@hallazgos-ips.com");
  console.log("   Password: Analista2026!");
  console.log("\n👤 USUARIO DE PRUEBA:");
  console.log("   Email: usuario@test.com");
  console.log("   Password: User123!");
  console.log("\n" + "=".repeat(60));

  // Listar todos los usuarios
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      nombre: true,
      role: true,
      codigo_habilitacion: true,
    },
    orderBy: {
      email: "asc",
    },
  });

  console.log("\n📋 TODOS LOS USUARIOS EN LA BASE DE DATOS:");
  allUsers.forEach((user, index) => {
    console.log(`\n   ${index + 1}. ${user.nombre} (${user.email})`);
    console.log(`      Rol: ${user.role}`);
    console.log(`      Código Habilitación: ${user.codigo_habilitacion}`);
  });
}

main()
  .catch((e) => {
    console.error("❌ Error durante el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
