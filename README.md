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

### Configurar Variables de Entorno en Vercel (Producción)

Para desplegar en producción en Vercel, sigue estos pasos:

#### 1. Acceder al Dashboard de Vercel
- Ve a [Vercel Dashboard](https://vercel.com/dashboard)
- Inicia sesión con tu cuenta
- Selecciona tu proyecto

#### 2. Configurar Variables de Entorno
- Ve a **Settings** → **Environment Variables**
- Haz clic en **Add New** para cada variable

**Variables requeridas:**

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexión a MySQL (Railway) | `mysql://user:pass@host:port/db` |
| `NEXTAUTH_URL` | URL de tu aplicación en producción | `https://tu-app.vercel.app` |
| `NEXTAUTH_SECRET` | Secret key para NextAuth (genera con `openssl rand -base64 32`) | `tu-secret-key-aqui` |
| `GEMINI_API_KEY` | API key de Gemini AI | `AIzaSy...` |
| `R2_ACCOUNT_ID` | Cloudflare R2 Account ID | `c36beae8...` |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 Access Key | `d41ebfb4...` |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 Secret Key | `907b2791...` |
| `R2_BUCKET_NAME` | Nombre del bucket R2 | `bioapp` |

#### 3. Seleccionar Ambientes
Para cada variable, selecciona los ambientes donde aplicará:
- ✅ **Production** - Para producción
- ✅ **Preview** - Para preview deployments
- ✅ **Development** - Para desarrollo (opcional)

#### 4. Guardar y Re-desplegar
- Haz clic en **Save** después de agregar cada variable
- Ve a **Deployments** → Selecciona el último deployment → **Redeploy**
- O simplemente haz un nuevo push a GitHub y Vercel desplegará automáticamente

#### 5. Verificar que las Variables Estén Cargadas
- Ve a **Deployments** → Selecciona un deployment → **Build Logs**
- Busca en los logs: `Environment Variables loaded`
- Si ves errores relacionados con variables faltantes, verifica que estén configuradas correctamente

**⚠️ Nota importante:** 
- Las variables de entorno en Vercel están **encriptadas y seguras automáticamente**
- **NUNCA** las almacenes en la base de datos
- **NUNCA** las expongas en el código del cliente (solo en API routes del servidor)
- Si cambias una variable, debes hacer **re-deploy** para que surta efecto

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
