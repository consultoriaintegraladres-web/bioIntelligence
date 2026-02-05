import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const usuarios = [
    {
      nombre: 'gerenciabio',
      email: 'gerencia@bioretail.com',
      password: 'GerenciaBio2026!',
    },
    {
      nombre: 'auditoriabio',
      email: 'auditoria@bioretail.com',
      password: 'AuditoriaBio2026!',
    }
  ];

  console.log('🚀 Creando nuevos administradores...');

  for (const u of usuarios) {
    const hashedPassword = await bcrypt.hash(u.password, 12);
    
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
        nombre: u.nombre
      },
      create: {
        email: u.email,
        nombre: u.nombre,
        password: hashedPassword,
        role: 'ADMIN',
        codigo_habilitacion: 'ADMIN'
      },
    });
    console.log(`✅ Usuario creado/actualizado: ${user.email}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error al crear usuarios:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
