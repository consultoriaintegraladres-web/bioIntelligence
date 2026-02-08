import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

enum Role {
  ADMIN = "ADMIN",
  USER = "USER",
  ANALYST = "ANALYST",
  COORDINADOR = "COORDINADOR",
}

// IPS users to create - will fetch codigo_habilitacion from database
const ipsUsersToCreate = [
  { email: "clinicasomeda@bioretail.com", password: "Someda2026!" },
  { email: "hospitalsan@bioretail.com", password: "HospSan2026!" },
  { email: "clinicasaludcoop@bioretail.com", password: "SaludC2026!" },
  { email: "medicenter@bioretail.com", password: "MediCen2026!" },
  { email: "clinicapalermo@bioretail.com", password: "Palermo2026!" },
];

async function main() {
  // Create/Update admin user (bioretail)
  const adminEmail = "admin@bioretail.com";
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("Admin123!", 12);
    
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        nombre: "Administrador Bioretail",
        codigo_habilitacion: "0000000000",
        role: Role.ADMIN,
      },
    });
    
    console.log("✅ Usuario admin creado: admin@bioretail.com / Admin123!");
  } else {
    console.log("ℹ️ Usuario admin ya existe: admin@bioretail.com");
  }

  // Create/Update admin user (hallazgos-ips) - del README
  const adminEmail2 = "admin@hallazgos-ips.com";
  
  const existingAdmin2 = await prisma.user.findUnique({
    where: { email: adminEmail2 },
  });

  if (!existingAdmin2) {
    const hashedPassword = await bcrypt.hash("Admin123!", 12);
    
    await prisma.user.create({
      data: {
        email: adminEmail2,
        password: hashedPassword,
        nombre: "Administrador",
        codigo_habilitacion: "0000000000",
        role: Role.ADMIN,
      },
    });
    
    console.log("✅ Usuario admin creado: admin@hallazgos-ips.com / Admin123!");
  } else {
    console.log("ℹ️ Usuario admin ya existe: admin@hallazgos-ips.com");
  }

  // Create Analyst user
  const analystEmail = "analista@bioretail.com";
  
  const existingAnalyst = await prisma.user.findUnique({
    where: { email: analystEmail },
  });

  if (!existingAnalyst) {
    const hashedPassword = await bcrypt.hash("Analista2026!", 12);
    
    await prisma.user.create({
      data: {
        email: analystEmail,
        password: hashedPassword,
        nombre: "Analista Bioretail",
        codigo_habilitacion: "0000000000",
        role: Role.ANALYST,
      },
    });
    
    console.log("✅ Usuario analista creado: analista@bioretail.com / Analista2026!");
  } else {
    console.log("ℹ️ Usuario analista ya existe");
  }

  // Create Coordinador users
  const coordinadores = [
    {
      email: "coordinador.gerencia@bioretail.com",
      password: "G3r3nc14$2026!B1oR3t41l",
      nombre: "Coordinador Gerencia",
      codigo_habilitacion: "0000000000",
    },
    {
      email: "coordinador.presidencia@bioretail.com",
      password: "Pr3s1d3nc14$2026!B1oR3t41l",
      nombre: "Coordinador Presidencia",
      codigo_habilitacion: "0000000000",
    },
    {
      email: "coordinador.auditoria@bioretail.com",
      password: "Aud1t0r14$2026!B1oR3t41l",
      nombre: "Coordinador Auditoria",
      codigo_habilitacion: "0000000000",
    },
  ];

  console.log("\n👔 Creando usuarios Coordinadores...\n");

  for (const coord of coordinadores) {
    const existingCoord = await prisma.user.findUnique({
      where: { email: coord.email },
    });

    if (!existingCoord) {
      const hashedPassword = await bcrypt.hash(coord.password, 12);
      
      await prisma.user.create({
        data: {
          email: coord.email,
          password: hashedPassword,
          nombre: coord.nombre,
          codigo_habilitacion: coord.codigo_habilitacion,
          role: Role.COORDINADOR,
        },
      });
      
      console.log(`✅ Usuario coordinador creado:`);
      console.log(`   📧 Email: ${coord.email}`);
      console.log(`   🔑 Password: ${coord.password}`);
      console.log(`   👔 Rol: ${coord.nombre}`);
      console.log("");
    } else {
      console.log(`ℹ️ Usuario ${coord.email} ya existe`);
    }
  }

  // Get distinct IPS from control_lotes to create users (PostgreSQL compatible)
  const ipsData = await prisma.$queryRawUnsafe<{ nombre_ips: string; codigo_habilitacion: string }[]>(`
    SELECT DISTINCT nombre_ips, codigo_habilitación as codigo_habilitacion
    FROM control_lotes 
    WHERE nombre_ips IS NOT NULL 
      AND nombre_ips != ''
      AND codigo_habilitación IS NOT NULL
    ORDER BY nombre_ips
    LIMIT 5
  `).catch(() => {
    // Si no hay datos en control_lotes aún, usar usuarios predefinidos
    console.log("⚠️ No hay datos en control_lotes, usando usuarios predefinidos");
    return [];
  });

  console.log("\n📋 IPS encontradas en la base de datos:");
  ipsData.forEach((ips, i) => {
    console.log(`   ${i + 1}. ${ips.nombre_ips} (${ips.codigo_habilitacion})`);
  });

  // Create IPS users
  console.log("\n🏥 Creando usuarios IPS...\n");
  
  for (let i = 0; i < Math.min(ipsData.length, ipsUsersToCreate.length); i++) {
    const ips = ipsData[i];
    const userConfig = ipsUsersToCreate[i];
    
    // Generate email based on IPS name
    const cleanName = ips.nombre_ips
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 20);
    
    const email = `${cleanName}@bioretail.com`;
    
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(userConfig.password, 12);
      
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          nombre: ips.nombre_ips,
          codigo_habilitacion: ips.codigo_habilitacion.substring(0, 10),
          role: Role.USER,
        },
      });
      
      console.log(`✅ Usuario IPS creado:`);
      console.log(`   📧 Email: ${email}`);
      console.log(`   🔑 Password: ${userConfig.password}`);
      console.log(`   🏥 IPS: ${ips.nombre_ips}`);
      console.log(`   📋 Código: ${ips.codigo_habilitacion.substring(0, 10)}`);
      console.log("");
    } else {
      console.log(`ℹ️ Usuario ${email} ya existe`);
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 RESUMEN DE CREDENCIALES");
  console.log("=".repeat(60));
  console.log("\n🔐 ADMINISTRADORES:");
  console.log("   Email: admin@bioretail.com");
  console.log("   Password: Admin123!");
  console.log("   Email: admin@hallazgos-ips.com");
  console.log("   Password: Admin123!");
  console.log("\n📊 ANALISTA:");
  console.log("   Email: analista@bioretail.com");
  console.log("   Password: Analista2026!");
  console.log("\n👔 COORDINADORES:");
  console.log("   Email: coordinador.gerencia@bioretail.com");
  console.log("   Password: G3r3nc14$2026!B1oR3t41l");
  console.log("   Email: coordinador.presidencia@bioretail.com");
  console.log("   Password: Pr3s1d3nc14$2026!B1oR3t41l");
  console.log("   Email: coordinador.auditoria@bioretail.com");
  console.log("   Password: Aud1t0r14$2026!B1oR3t41l");
  console.log("\n🏥 USUARIOS IPS:");
  
  const allUsers = await prisma.user.findMany({
    where: { role: Role.USER },
    select: { email: true, nombre: true, codigo_habilitacion: true },
  });
  
  allUsers.forEach((user, i) => {
    console.log(`\n   ${i + 1}. ${user.nombre}`);
    console.log(`      Email: ${user.email}`);
    console.log(`      Código: ${user.codigo_habilitacion}`);
    console.log(`      Password: ${ipsUsersToCreate[i]?.password || "Ver arriba"}`);
  });
  
  console.log("\n" + "=".repeat(60));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
