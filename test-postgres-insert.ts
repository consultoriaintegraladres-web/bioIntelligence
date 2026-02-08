/**
 * Script de prueba para insertar datos autogenerados en furips1 y furips2 (PostgreSQL)
 * Uso: npx tsx test-postgres-insert.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

// Generar datos de prueba para FURIPS1 (102 campos)
function generateFurips1Record(numeroLote: number, index: number): any {
  const numeroFactura = `FAC${String(index + 1).padStart(6, "0")}`;
  const codigoHab = "123456789012";
  
  return {
    id: index + 1,
    Numero_radicado_anterior: `RAD${index + 1}`,
    RGO_Respuesta_a_Glosa_u_objecion: "N",
    Numero_factura: numeroFactura,
    Numero_consecutivo_reclamacion: `CONS${index + 1}`,
    Codigo_habilitacion_prestador_servicios_salud: codigoHab,
    Primer_apellido_victima: "APELLIDO",
    Segundo_apellido_victima: "PRUEBA",
    Primer_nombre_victima: "NOMBRE",
    Segundo_nombre_victima: "TEST",
    Tipo_documento_de_identidad_victima: "CC",
    Numero_documento_de_identidad_victima: `12345678${index}`,
    Fecha_nacimiento_victima: new Date("1990-01-01"),
    Fecha_fallecimiento: null,
    Sexo_victima: "M",
    Direccion_residencia_victima: "Calle 123",
    Codigo_departamento_de_residencia_victima: "11",
    Codigo_municipio_residencia_victima: "001",
    Telefono_victima: "3001234567",
    Condicion_victima: "VIVO",
    Naturaleza_evento: "ACCIDENTE",
    Descripcion_otro_evento: null,
    Direccion_ocurrencia_evento: "Calle 456",
    Fecha_ocurrencia_evento: new Date("2024-01-15"),
    Hora_ocurrencia_evento: new Date("2024-01-15T10:30:00"),
    Codigo_departamento_ocurrencia_evento: "11",
    Codigo_municipio_ocurrencia_evento: "001",
    Zona_ocurrencia_evento: "URBANA",
    Estado_aseguramiento: "ASEGURADO",
    Marca: "TOYOTA",
    Placa: `ABC${index}${index}${index}`,
    Tipo_Vehiculo: "AUTOMOVIL",
    Codigo_aseguradora: "001",
    Numero_poliza_SOAT: `POL${index + 1}`,
    Fecha_inicio_vigencia_de_poliza: new Date("2024-01-01"),
    Fecha_final_vigencia_poliza: new Date("2024-12-31"),
    Numero_radicado_SIRAS: `SIR${index + 1}`,
    Cobro_por_agotamiento_tope_Aseguradora: "N",
    Codigo_CUPS_servicio_principal_hospitalizacion: "CUPS001",
    Complejidad_procedimiento_quirurgico: "BAJA",
    Codigo_CUPS_procedimiento_quirurgico_principal: null,
    Codigo_CUPS_procedimiento_quirurgico_secundario: null,
    Se_presto_servicio_UCI: "N",
    Dias_UCI_reclamados: null,
    Tipo_documento_de_identidad_propietario: "CC",
    Numero_documento_identidad_propietario: `98765432${index}`,
    Primer_apellido_propietario: "PROPIETARIO",
    Segundo_apellido_propietario: "TEST",
    Primer_nombre_propietario: "NOMBRE",
    Segundo_nombre_propietario: "PROP",
    Direccion_residencia_propietario: "Calle 789",
    Telefono_residencia_propietario: "3009876543",
    Codigo_departamento_residencia_propietario: "11",
    Codigo_municipio_residencia_propietario: "001",
    Primer_apellido_conductor: "CONDUCTOR",
    Segundo_apellido_conductor: "TEST",
    Primer_nombre_conductor: "NOMBRE",
    Segundo_nombre_conductor: "COND",
    Tipo_documento_identidad_conductor: "CC",
    Numero_documento_identidad_conductor: `55555555${index}`,
    Direccion_residencia_conductor: "Calle 321",
    Codigo_departamento_residencia_conductor: "11",
    Codigo_municipio_residencia_conductor: "001",
    Telefono_residencia_conductor: "3005555555",
    Tipo_referencia: "REMISION",
    Fecha_remision: new Date("2024-01-15"),
    Hora_salida: new Date("2024-01-15T11:00:00"),
    Codigo_habilitacion_prestador_servicios_de_salud_remitente: codigoHab,
    Profesional_que_remite: "DR. TEST",
    Cargo_persona_que_remite: "MEDICO",
    Fecha_ingreso: new Date("2024-01-15"),
    Hora_ingreso: new Date("2024-01-15T12:00:00"),
    Codigo_habilitacion_prestador_servicios_salud_que_recibe: codigoHab,
    Profesional_que_recibe: "DR. RECIBE",
    Placa_ambulancia_que_realiza_el_traslado_interinstitucional: `AMB${index}`,
    Placa_ambulancia_traslado_primario: `AMB${index}`,
    Transporte_victima_desde_el_sitio_evento: "AMBULANCIA",
    Transporte_victima_hasta_el_fin_recorrido: "AMBULANCIA",
    Tipo_servicio_transporte: "URGENCIA",
    Zona_donde_recoge_victima: "URBANA",
    Fecha_ingreso1: new Date("2024-01-15"),
    Hora_ingreso1: new Date("2024-01-15T12:00:00"),
    Fecha_egreso: new Date("2024-01-20"),
    Hora_egreso: new Date("2024-01-20T14:00:00"),
    Codigo_diagnostico_principal_ingreso: "S72.0",
    Codigo_diagnostico_ingreso_asociado_1: null,
    Codigo_diagnostico_ingreso_asociado_2: null,
    Codigo_diagnostico_principal_egreso: "S72.0",
    Codigo_diagnostico_egreso_asociado_1: null,
    Codigo_diagnostico_egreso_asociado_2: null,
    Primer_apellido_medico: "MEDICO",
    Segundo_apellido_medico: "TEST",
    Primer_nombre_medico: "NOMBRE",
    Segundo_nombre_medico: "MED",
    Tipo_documento_identidad_medico: "CC",
    Numero_documento_de_identidad_medico: `11111111${index}`,
    Numero_registro_medico: `RM${index + 1}`,
    Total_facturado_por_amparo_gastos_medicos_quirurgicos: 1000000 + (index * 10000),
    Total_reclamado_por_amparo_gastos_medicos_quirurgicos: 1000000 + (index * 10000),
    Total_facturado_por_amparo_gastos_transporte: 500000 + (index * 5000),
    Total_reclamado_por_amparo_gastos_transporte: 500000 + (index * 5000),
    Manifestacion_servicios_habilitados: "SI",
    Descripcion_evento: `Evento de prueba ${index + 1}`,
    numero_lote: numeroLote,
    usuario: "test@example.com",
  };
}

// Generar datos de prueba para FURIPS2 (9 campos)
function generateFurips2Record(numeroLote: number, index: number, facturaIndex: number): any {
  return {
    id: index + 1,
    Numero_factura: `FAC${String(facturaIndex).padStart(6, "0")}`,
    Numero_consecutivo_de_la_reclamacion: `CONS${facturaIndex}`,
    Tipo_de_servicio: "CONSULTA",
    Codigo_del_servicio: `SERV${index + 1}`,
    Descripcion_del_servicio_o_elemento_reclamado: `Servicio de prueba ${index + 1}`,
    Cantidad_de_servicios: 1 + (index % 5),
    Valor_unitario: 50000 + (index * 1000),
    Valor_total_facturado: (50000 + (index * 1000)) * (1 + (index % 5)),
    Valor_total_reclamado: (50000 + (index * 1000)) * (1 + (index % 5)),
    numero_lote: numeroLote,
    usuario: "test@example.com",
  };
}

async function testPostgresInsert() {
  console.log("🧪 Iniciando prueba de inserción en PostgreSQL...\n");

  // Verificar conexión
  try {
    await prisma.$connect();
    console.log("✅ Conexión a PostgreSQL establecida\n");
  } catch (error: any) {
    console.error("❌ Error al conectar a PostgreSQL:", error.message);
    process.exit(1);
  }

  const numeroLote = Math.floor(Date.now() / 1000); // Usar timestamp en segundos como número de lote único (más pequeño)
  const nombreIps = "IPS PRUEBA";
  const codigoHabilitacion = "123456789012";
  const nombreEnvio = `TEST_ENVIO_${numeroLote}`;
  const cantidadFacturas = 5;
  const valorReclamado = 5000000;

  try {
    // 1. Limpiar tablas anteriores
    console.log("🗑️  Limpiando tablas anteriores...");
    await prisma.$executeRaw`DELETE FROM furips1`;
    await prisma.$executeRaw`DELETE FROM furips2`;
    await prisma.$executeRaw`DELETE FROM control_lotes WHERE nombre_envio LIKE 'TEST_ENVIO_%'`;
    console.log("✅ Tablas limpiadas\n");

    // 2. Generar e insertar FURIPS1 (5 registros)
    console.log("📊 Generando e insertando FURIPS1...");
    const furips1Records = [];
    for (let i = 0; i < cantidadFacturas; i++) {
      furips1Records.push(generateFurips1Record(numeroLote, i));
    }
    
    await prisma.furips1.createMany({
      data: furips1Records,
      skipDuplicates: true,
    });
    console.log(`✅ ${furips1Records.length} registros insertados en furips1\n`);

    // 3. Generar e insertar FURIPS2 (10 registros, 2 por factura)
    console.log("📊 Generando e insertando FURIPS2...");
    const furips2Records = [];
    for (let i = 0; i < cantidadFacturas * 2; i++) {
      const facturaIndex = Math.floor(i / 2) + 1;
      furips2Records.push(generateFurips2Record(numeroLote, i, facturaIndex));
    }
    
    await prisma.furips2.createMany({
      data: furips2Records,
      skipDuplicates: true,
    });
    console.log(`✅ ${furips2Records.length} registros insertados en furips2\n`);

    // 4. Insertar en control_lotes usando Prisma
    console.log("📋 Insertando en control_lotes...");
    try {
      await prisma.controlLote.upsert({
        where: { id: numeroLote },
        update: {
          numero_lote: numeroLote,
          fecha_creacion: new Date(),
          nombre_ips: nombreIps,
          codigo_habilitacion: codigoHabilitacion,
          cantidad_facturas: cantidadFacturas,
          valor_reclamado: valorReclamado,
          nombre_envio: nombreEnvio,
          tipo_envio: "FURIPS",
        },
        create: {
          id: numeroLote,
          numero_lote: numeroLote,
          fecha_creacion: new Date(),
          nombre_ips: nombreIps,
          codigo_habilitacion: codigoHabilitacion,
          cantidad_facturas: cantidadFacturas,
          valor_reclamado: valorReclamado,
          nombre_envio: nombreEnvio,
          tipo_envio: "FURIPS",
        },
      });
      console.log(`✅ Registro insertado en control_lotes: ${nombreEnvio}\n`);
    } catch (error: any) {
      // Si upsert falla, intentar insert directo
      console.log("⚠️ Upsert falló, intentando insert directo...");
      await prisma.controlLote.create({
        data: {
          id: numeroLote,
          numero_lote: numeroLote,
          fecha_creacion: new Date(),
          nombre_ips: nombreIps,
          codigo_habilitacion: codigoHabilitacion,
          cantidad_facturas: cantidadFacturas,
          valor_reclamado: valorReclamado,
          nombre_envio: nombreEnvio,
          tipo_envio: "FURIPS",
        },
      });
      console.log(`✅ Registro insertado en control_lotes: ${nombreEnvio}\n`);
    }

    // 5. Verificar datos insertados
    console.log("🔍 Verificando datos insertados...");
    const countFurips1 = await prisma.furips1.count({ where: { numero_lote: numeroLote } });
    const countFurips2 = await prisma.furips2.count({ where: { numero_lote: numeroLote } });
    const controlLote = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM control_lotes WHERE id = ${numeroLote}
    `;

    console.log(`\n📊 RESUMEN:`);
    console.log(`   FURIPS1: ${countFurips1} registros`);
    console.log(`   FURIPS2: ${countFurips2} registros`);
    console.log(`   control_lotes: ${controlLote.length > 0 ? "✅ Registro encontrado" : "❌ No encontrado"}`);
    if (controlLote.length > 0) {
      console.log(`   - Nombre IPS: ${controlLote[0].nombre_ips}`);
      console.log(`   - Nombre Envío: ${controlLote[0].nombre_envio}`);
      console.log(`   - Cantidad Facturas: ${controlLote[0].cantidad_facturas}`);
      console.log(`   - Valor Reclamado: ${controlLote[0].valor_reclamado}`);
    }

    console.log("\n✨ Prueba completada exitosamente!");
  } catch (error: any) {
    console.error("\n❌ Error durante la prueba:");
    console.error(error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar prueba
testPostgresInsert().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
