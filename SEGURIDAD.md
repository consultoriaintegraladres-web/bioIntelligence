# 🔒 SEGURIDAD - PROTECCIÓN DE CREDENCIALES

## ⚠️ REGLA CRÍTICA
**NUNCA subir credenciales, contraseñas o URLs de conexión a GitHub.**

## 🚫 Archivos que NUNCA deben estar en el repositorio

- `.env` y `.env.local` (ya están en .gitignore)
- Cualquier archivo con contraseñas reales
- Archivos de documentación con URLs de conexión completas
- Scripts con credenciales hardcodeadas

## ✅ Archivos Seguros (Pueden estar en el repo)

- `.env.example` (con valores de ejemplo, sin credenciales reales)
- Documentación con placeholders: `postgresql://user:****@host:port/db`
- Scripts que leen de variables de entorno

## 📋 Configuración de DATABASE_URL

### En Local (.env.local)
```env
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA_AQUI@host:port/database
```

### En Railway (Variables de Entorno)
1. Ve a Railway → Tu Proyecto → Variables
2. Agrega/Edita `DATABASE_URL`
3. Pega la URL completa con la contraseña
4. **NUNCA** la pongas en código o documentación

## 🔍 Verificación Antes de Commit

Antes de hacer commit, verifica:

```bash
# Buscar posibles credenciales expuestas
git diff --cached | grep -i "password\|secret\|credential\|DATABASE_URL.*postgres\|DATABASE_URL.*mysql"
```

Si encuentras algo, **NO hagas commit**.

## 🛡️ Protecciones Implementadas

- `.gitignore` incluye `.env*` (todos los archivos de entorno)
- `.gitignore` excluye archivos con `*credentials*`, `*password*`, `*secret*`
- `.gitignore` excluye archivos de documentación con `*database*.md`

## 📝 Si Necesitas Documentar Configuración

Usa placeholders:

```markdown
DATABASE_URL=postgresql://postgres:****@host:port/database
```

O valores de ejemplo:

```markdown
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
```

**NUNCA uses contraseñas reales de producción.**
