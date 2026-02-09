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

async function createOrUpdateViews() {
  console.log("\n📋 Creando/actualizando vistas PostgreSQL...\n");

  // ======================================================================
  // VIEW: revision_facturas
  // Converted from MySQL to PostgreSQL. Used by /api/revision-facturas
  // ======================================================================
  try {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE VIEW revision_facturas AS
      WITH cte_errores AS (
        SELECT DISTINCT "Numero_factura"
        FROM inconsistencias
      ),
      facturas_primera AS (
        SELECT DISTINCT f."Numero_factura"
        FROM furips1_consolidado f
        JOIN control_lotes cl ON f.numero_lote = cl.numero_lote
        WHERE cl.tipo_envio = 'Primera vez'
      ),
      facturas_revalidacion AS (
        SELECT DISTINCT f."Numero_factura"
        FROM furips1_consolidado f
        JOIN control_lotes cl ON f.numero_lote = cl.numero_lote
        WHERE cl.tipo_envio = 'Revalidacion'
      )
      SELECT
        CASE
          WHEN fp."Numero_factura" IS NOT NULL AND err."Numero_factura" IS NOT NULL THEN 'Ver hallazgos'
          ELSE 'Ok Sin hallazgos'
        END AS "Primera_revision",
        CASE
          WHEN fp."Numero_factura" IS NULL OR err."Numero_factura" IS NULL THEN 'No requiere segunda revisión'
          WHEN fp."Numero_factura" IS NOT NULL AND err."Numero_factura" IS NOT NULL 
               AND fr."Numero_factura" IS NOT NULL AND err."Numero_factura" IS NOT NULL THEN 'Ver hallazgos'
          WHEN fp."Numero_factura" IS NOT NULL AND err."Numero_factura" IS NOT NULL 
               AND fr."Numero_factura" IS NOT NULL AND err."Numero_factura" IS NULL THEN 'Ok sin hallazgos'
          ELSE 'No fue reenviada'
        END AS segunda_revision,
        f.id,
        f."Numero_radicado_anterior",
        f."RGO_Respuesta_a_Glosa_u_objecion",
        f."Numero_factura",
        f."Codigo_habilitacion_prestador_servicios_salud",
        f."Primer_apellido_victima",
        f."Segundo_apellido_victima",
        f."Primer_nombre_victima",
        f."Segundo_nombre_victima",
        f."Tipo_documento_de_identidad_victima",
        f."Numero_documento_de_identidad_victima",
        f."Condicion_victima",
        f."Naturaleza_evento",
        f."Direccion_ocurrencia_evento",
        f."Fecha_ocurrencia_evento",
        f."Hora_ocurrencia_evento",
        f."Estado_aseguramiento",
        f."Marca",
        f."Placa",
        f."Tipo_Vehiculo",
        f."Codigo_aseguradora",
        f."Numero_poliza_SOAT",
        f."Fecha_inicio_vigencia_de_poliza",
        f."Fecha_final_vigencia_poliza",
        f."Numero_radicado_SIRAS",
        f."Cobro_por_agotamiento_tope_Aseguradora",
        f."Codigo_CUPS_servicio_principal_hospitalizacion",
        f."Complejidad_procedimiento_quirurgico",
        f."Codigo_CUPS_procedimiento_quirurgico_principal",
        f."Codigo_CUPS_procedimiento_quirurgico_secundario",
        f."Se_presto_servicio_UCI",
        f."Dias_UCI_reclamados",
        f."Tipo_documento_de_identidad_propietario",
        f."Numero_documento_identidad_propietario",
        f."Primer_apellido_propietario",
        f."Segundo_apellido_propietario",
        f."Primer_nombre_propietario",
        f."Segundo_nombre_propietario",
        f."Direccion_residencia_propietario",
        f."Codigo_departamento_residencia_propietario",
        f."Codigo_municipio_residencia_propietario",
        f."Primer_apellido_conductor",
        f."Segundo_apellido_conductor",
        f."Primer_nombre_conductor",
        f."Segundo_nombre_conductor",
        f."Tipo_documento_identidad_conductor",
        f."Numero_documento_identidad_conductor",
        f."Direccion_residencia_conductor",
        f."Codigo_departamento_residencia_conductor",
        f."Codigo_municipio_residencia_conductor",
        f."Fecha_ingreso1",
        f."Hora_ingreso1",
        f."Fecha_egreso",
        f."Hora_egreso",
        f."Codigo_diagnostico_principal_ingreso",
        f."Codigo_diagnostico_principal_egreso",
        f."Primer_apellido_medico",
        f."Segundo_apellido_medico",
        f."Primer_nombre_medico",
        f."Segundo_nombre_medico",
        f."Tipo_documento_identidad_medico",
        f."Numero_documento_de_identidad_medico",
        f."Numero_registro_medico",
        f."Total_facturado_por_amparo_gastos_medicos_quirurgicos",
        f."Total_reclamado_por_amparo_gastos_medicos_quirurgicos",
        f."Total_facturado_por_amparo_gastos_transporte",
        f."Total_reclamado_por_amparo_gastos_transporte",
        f."Descripcion_evento",
        f.numero_lote,
        f.usuario
      FROM furips1_consolidado f
      LEFT JOIN cte_errores err ON f."Numero_factura" = err."Numero_factura"
      LEFT JOIN facturas_primera fp ON f."Numero_factura" = fp."Numero_factura"
      LEFT JOIN facturas_revalidacion fr ON f."Numero_factura" = fr."Numero_factura"
    `);
    console.log("✅ Vista revision_facturas creada/actualizada");
  } catch (error: any) {
    console.error("⚠️ Error creando vista revision_facturas:", error.message);
  }

  // ======================================================================
  // VIEW: vista_consolidado_facturas_lote
  // Aggregation view used by /api/consolidado-facturas
  // ======================================================================
  try {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE VIEW vista_consolidado_facturas_lote AS
      SELECT
        f.numero_lote,
        COUNT(DISTINCT f."Numero_factura") AS conteo_factura,
        COALESCE(SUM(f."Total_reclamado_por_amparo_gastos_medicos_quirurgicos"), 0) AS total_suma_reclamado,
        COUNT(DISTINCT CASE WHEN err."Numero_factura" IS NOT NULL THEN f."Numero_factura" END) AS con_hallazgos,
        COUNT(DISTINCT CASE WHEN err."Numero_factura" IS NULL THEN f."Numero_factura" END) AS sin_hallazgos,
        COUNT(err."Numero_factura") AS conteo_hallazgos_criticos,
        COALESCE(SUM(CASE WHEN err."Numero_factura" IS NOT NULL THEN f."Total_reclamado_por_amparo_gastos_medicos_quirurgicos" ELSE 0 END), 0) AS valor_total_hallazgos_criticos
      FROM furips1_consolidado f
      LEFT JOIN (
        SELECT DISTINCT "Numero_factura"
        FROM inconsistencias
      ) err ON f."Numero_factura" = err."Numero_factura"
      GROUP BY f.numero_lote
    `);
    console.log("✅ Vista vista_consolidado_facturas_lote creada/actualizada");
  } catch (error: any) {
    console.error("⚠️ Error creando vista vista_consolidado_facturas_lote:", error.message);
  }
}

async function main() {
  // Create/Update PostgreSQL views
  await createOrUpdateViews();

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
