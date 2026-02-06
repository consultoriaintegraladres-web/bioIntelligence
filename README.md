# Hallazgos IPS - Sistema de Auditoría con IA

Sistema de gestión de hallazgos e inconsistencias de IPS detectados por robot de IA para facturas de prestación de servicios de salud por accidentes de tránsito.

## Stack Tecnológico

- **Frontend:** Next.js 16, React 19, TypeScript
- **UI:** Tailwind CSS 4, shadcn/ui, Framer Motion
- **Gráficos:** Plotly.js (3D interactivos)
- **Estado:** TanStack Query v5
- **Autenticación:** NextAuth.js v5 (JWT)
- **ORM:** Prisma 5 + MySQL
- **Base de datos:** MySQL (Railway)

## Características

- Dashboard interactivo con KPIs y gráficos 3D
- Sistema de filtros dinámicos con restricción de 1 mes
- Control de acceso por código de habilitación
- Dos pestañas: Resumen (Dashboard) y Detalle de Facturas
- Exportación a CSV
- Tema oscuro futurista con glassmorphism
- Animaciones fluidas con Framer Motion

## Instalación

```bash
# Instalar dependencias
npm install

# Generar cliente Prisma
npm run db:generate

# Ejecutar seed (crear usuarios)
npm run db:seed

# Iniciar servidor de desarrollo
npm run dev
```

## Variables de Entorno

Crear archivo `.env.local` con:

```env
DATABASE_URL="mysql://user:password@host:port/database"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
GEMINI_API_KEY="your-gemini-api-key"
```

### Obtener API Key de Gemini

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea una nueva API key
3. Agrega la key a tu archivo `.env.local` como `GEMINI_API_KEY`

### Configurar Variables de Entorno en Vercel

Para producción en Vercel, debes configurar las variables de entorno en el dashboard de Vercel:

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Agrega las siguientes variables:
   - `DATABASE_URL` - URL de conexión a MySQL
   - `NEXTAUTH_URL` - URL de tu aplicación (ej: `https://tu-app.vercel.app`)
   - `NEXTAUTH_SECRET` - Secret key para NextAuth (genera una con `openssl rand -base64 32`)
   - `GEMINI_API_KEY` - Tu API key de Gemini
5. Selecciona los ambientes donde aplicar (Production, Preview, Development)
6. Haz clic en **Save**
7. **Re-deploy** tu aplicación para que los cambios surtan efecto

**Nota importante:** Las variables de entorno en Vercel están **encriptadas y seguras**. Nunca las almacenes en la base de datos ni las expongas en el código del cliente.

## Usuarios de Prueba

| Rol   | Email                     | Contraseña |
|-------|---------------------------|------------|
| Admin | admin@hallazgos-ips.com   | Admin123!  |
| User  | usuario@test.com          | User123!   |

## Estructura del Proyecto

```
src/
├── app/
│   ├── (auth)/login/       # Página de login
│   ├── (dashboard)/        # Layout del dashboard
│   │   ├── resumen/        # Pestaña 1: Dashboard
│   │   └── detalle/        # Pestaña 2: Facturas
│   └── api/                # API Routes
├── components/
│   ├── ui/                 # Componentes shadcn
│   ├── charts/             # Gráficos 3D
│   ├── filters/            # Filtros dinámicos
│   └── tables/             # Tablas de datos
└── lib/                    # Utilidades
```

## API Endpoints

- `GET /api/lotes` - Obtener lotes de control
- `GET /api/inconsistencias` - Obtener inconsistencias
- `GET /api/reportes` - Obtener reportes y KPIs
  - `?tipo=kpis` - KPIs del dashboard
  - `?tipo=resumen_validacion` - Resumen por tipo de validación
  - `?tipo=resumen_origen` - Resumen por origen

## Seguridad

- Autenticación con NextAuth.js (JWT)
- Passwords hasheados con bcrypt (12 rounds)
- Control de acceso por código de habilitación
- Usuarios normales solo ven sus propios registros
- Administradores pueden ver todos los registros
- Restricción de rango de fechas (máximo 1 mes) para usuarios normales

## Scripts

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run db:generate  # Generar cliente Prisma
npm run db:seed      # Seed de usuarios
```
