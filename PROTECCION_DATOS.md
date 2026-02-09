# 🛡️ PROTECCIÓN DE DATOS - NUNCA BORRAR TABLAS

## ⚠️ REGLA CRÍTICA
**NUNCA usar `--force-reset` en producción. Esto BORRA TODAS LAS TABLAS.**

## ✅ Scripts Seguros

### Build Script (package.json)
```json
"build": "prisma generate && prisma db push && next build"
```
- ✅ `prisma db push` → Solo actualiza schema, NO borra datos
- ❌ `prisma db push --force-reset` → **BORRA TODA LA BD** (NUNCA USAR)

### Otros Scripts
```json
"db:push": "prisma db push"  // ✅ Seguro, solo actualiza schema
"db:seed": "npx tsx prisma/seed.ts"  // ✅ Solo crea usuarios si no existen
```

## 📋 DELETE Statements Permitidos (Solo en Carga de Archivos)

Los siguientes DELETE son **intencionales** y solo borran datos cuando se carga un nuevo archivo FURIPS:

### En `furips-processor.ts` (líneas 548-552)
```typescript
await prisma.$executeRaw`DELETE FROM "furips1"`;
await prisma.$executeRaw`DELETE FROM "furips2"`;
await prisma.$executeRaw`DELETE FROM "FURTRAN"`;
```

**Esto es CORRECTO** porque:
- Solo se ejecuta cuando se carga un nuevo archivo FURIPS
- Borra solo `furips1`, `furips2` y `FURTRAN` (tablas temporales de carga)
- **NO borra** otras tablas como `control_lotes`, `users`, `inconsistencias`, etc.

## 🚫 Comandos PROHIBIDOS en Producción

```bash
# ❌ NUNCA usar estos comandos en producción:
prisma db push --force-reset
prisma migrate reset
DROP TABLE ...
TRUNCATE TABLE ... (excepto furips1/furips2/FURTRAN en carga)
```

## ✅ Comandos Seguros

```bash
# ✅ Estos comandos son seguros:
prisma db push                    # Solo actualiza schema
prisma generate                   # Solo genera cliente
prisma migrate deploy            # Solo aplica migraciones pendientes
```

## 🔍 Verificación Antes de Push

Antes de hacer push a producción, verifica:

1. ✅ `package.json` NO tiene `--force-reset`
2. ✅ No hay scripts que ejecuten `DROP TABLE` o `TRUNCATE` en todas las tablas
3. ✅ Los DELETE solo afectan `furips1`, `furips2`, `FURTRAN` (tablas de carga)

## 📝 Notas

- `prisma db push` sin flags es **seguro** porque solo sincroniza el schema con la BD
- Si hay cambios incompatibles en el schema, Prisma te avisará y NO borrará datos
- Para cambios grandes de schema, usa migraciones (`prisma migrate`) en lugar de `db push`
