# Flujo de Carga FURIPS - Sistema de Procesamiento de Datos

## 📋 Resumen
Sistema completo para cargar, validar e insertar datos de archivos FURIPS1, FURIPS2 y FURTRAN en la base de datos, con validaciones robustas, backups automáticos y manejo de advertencias.

---

## 🔄 Flujo Completo

### 1. **Carga de Archivos (Frontend)**
   - Usuario accede a `/carga-furips`
   - Ingresa **ID/Nombre del Envío** (obligatorio, único por día)
   - Selecciona archivos:
     - `FURIPS1.txt` (102 campos) - **obligatorio con FURIPS2**
     - `FURIPS2.txt` (9 campos) - **obligatorio con FURIPS1**
     - `FURTRAN.txt` (46 campos) - **opcional, puede cargarse solo**
     - `soportes.zip` - **obligatorio**

### 2. **Validación Inicial** (`/api/upload-furips`)
   - Valida estructura de archivos:
     - **FURIPS1:** 102 campos por línea
     - **FURIPS2:** 9 campos por línea
     - **FURTRAN:** 46 campos por línea
   - Extrae código de habilitación (primeros 10 dígitos del campo 5 de FURIPS1)
   - Verifica que el `idEnvio` sea único para el día
   - Calcula resúmenes:
     - Estado de Aseguramiento (FURIPS1 campo 28)
     - Condición de Víctima (FURIPS1 campo 19)
     - Tipo de Servicio (FURIPS2 campo 3)
   - Retorna datos validados al frontend

### 3. **Carga del ZIP** (`/api/upload-zip`)
   - Usuario presiona "Subir Soportes"
   - Sube todos los archivos a Cloudflare R2:
     - Estructura: `{nombreIPS}/{YYYY-MM-DD}_{idEnvio}/`
     - Archivos: `FURIPS1_xxx.txt`, `FURIPS2_xxx.txt`, `FURTRAN_xxx.txt`, `soportes.zip`
   - Registra envío en `control_envios_ips`
   - **Llama al procesador de datos** (`processFuripsData`)

---

## 🛠️ Procesamiento de Datos (`furips-processor.ts`)

### Paso 1: Crear Backups Automáticos
```typescript
// Backup de todas las tablas antes de eliminar
INSERT INTO furips1_backup SELECT * FROM furips1
INSERT INTO furips2_backup SELECT * FROM furips2
INSERT INTO FURTRAN_backup SELECT * FROM FURTRAN
```

### Paso 2: Limpiar Tablas
```typescript
DELETE FROM furips1
DELETE FROM furips2
DELETE FROM FURTRAN
```

### Paso 3: Validación y Transformación de Datos

#### **Validaciones Implementadas:**

##### 📅 **Fechas** (parseDate)
- Acepta formatos: `YYYY-MM-DD` o `DD/MM/YYYY`
- Valida rangos: 1900-2100, mes 1-12, día 1-31
- Convierte a `Date` de PostgreSQL
- Si es inválida → `NULL` + advertencia

##### ⏰ **Horas** (parseTime)
- Acepta formatos: `HH:MM:SS` o `HH:MM`
- Valida rangos: horas 0-23, minutos 0-59, segundos 0-59
- Convierte a `Time(0)` de PostgreSQL
- Si es inválida → `NULL` + advertencia

##### 🔢 **Números Decimales** (parseDecimal)
- Convierte strings a números con decimales
- Si no es numérico → `NULL` + advertencia

##### 🔢 **Números Enteros** (parseInteger)
- Convierte strings a enteros
- Si no es numérico → `NULL` + advertencia

##### ✂️ **Truncamiento de Strings** (truncateString)
- Verifica longitud máxima según campo
- Si excede → trunca y **ADVIERTE al usuario**
- Ejemplos:
  - `Numero_factura`: máx 50 caracteres
  - `Descripcion_evento`: máx 1000 caracteres
  - `Direccion_residencia_victima`: máx 300 caracteres

### Paso 4: Inserción de Registros

#### **FURIPS1** (102 campos)
```typescript
processFurips1Line(fields, lineNumber, numeroLote, usuario, warnings)
```
- Procesa cada línea con validaciones
- Inserta en tabla `furips1`
- Registra advertencias por campo

#### **FURIPS2** (9 campos)
```typescript
processFurips2Line(fields, lineNumber, numeroLote, usuario, warnings)
```
- Procesa cada línea con validaciones
- Inserta en tabla `furips2`
- Registra advertencias por campo

#### **FURTRAN** (46 campos)
```typescript
processFurtranLine(fields, lineNumber, warnings)
```
- Procesa cada línea con validaciones
- Inserta en tabla `FURTRAN`
- Campo 45 (índice 44) contiene el valor
- Registra advertencias por campo

---

## ⚠️ Sistema de Advertencias

### Tipos de Advertencias:
1. **Formato inválido** - Fecha/hora no reconocida
2. **Fuera de rango** - Valores numéricos fuera de límites
3. **Truncamiento** - Campo excede longitud máxima
4. **Error de inserción** - Problema al insertar registro

### Estructura de Advertencia:
```typescript
{
  line: number;           // Número de línea del archivo
  field: string;          // Nombre del campo
  issue: string;          // Descripción del problema
  originalValue: string;  // Valor original
  adjustedValue: string;  // Valor ajustado (NULL, truncado, etc.)
}
```

### Resultado del Proceso:
```typescript
{
  success: boolean;
  warnings: ValidationWarning[];
  recordsProcessed: {
    furips1: number;
    furips2: number;
    furtran: number;
  };
  backupsCreated: {
    furips1: number;
    furips2: number;
    furtran: number;
  };
  error?: string;
}
```

---

## 📊 Tablas de Base de Datos

### Tablas Principales:
- `furips1` - Datos de víctimas y accidentes
- `furips2` - Detalle de servicios prestados
- `FURTRAN` - Datos de transporte

### Tablas de Backup:
- `furips1_backup` - Backup automático antes de cada carga
- `furips2_backup` - Backup automático antes de cada carga
- `FURTRAN_backup` - Backup automático antes de cada carga

### Tabla de Control:
- `control_envios_ips` - Registro de cada envío con metadata

---

## 🔐 Permisos por Rol

### ADMIN
- ✅ Puede cargar archivos
- ✅ Puede ver todos los envíos
- ✅ Puede cambiar estado de envíos

### IPS (USER)
- ✅ Puede cargar sus propios archivos
- ✅ Solo ve sus propios envíos
- ❌ No puede cambiar estados

### ANALYST
- ❌ No puede cargar archivos
- ✅ Puede ver todos los envíos
- ❌ No puede cambiar estados

---

## 🚀 Ejemplo de Uso

1. IPS inicia sesión
2. Va a "Carga FURIPS"
3. Ingresa ID: "ENVIO_ENERO_2026"
4. Selecciona FURIPS1.txt (150 facturas)
5. Selecciona FURIPS2.txt (2,500 ítems)
6. Selecciona FURTRAN.txt (opcional)
7. Presiona "Validar Archivos"
8. Sistema muestra resúmenes y validaciones
9. Selecciona soportes.zip
10. Presiona "Subir Soportes"

### Proceso Automático:
```
✅ Archivos subidos a R2
✅ Backup creado: 120 registros FURIPS1, 2,100 FURIPS2
✅ Tablas limpiadas
✅ Procesando FURIPS1...
   ⚠️ Línea 45: Fecha_nacimiento_victima - Formato inválido → NULL
   ⚠️ Línea 78: Descripcion_evento - Truncado de 1500 a 1000 chars
✅ 150 registros FURIPS1 insertados
✅ Procesando FURIPS2...
   ⚠️ Línea 234: Valor_unitario - Valor no numérico → NULL
✅ 2,500 registros FURIPS2 insertados
✅ Procesando FURTRAN...
✅ 50 registros FURTRAN insertados
⚠️ Total: 3 advertencias

✅ CARGA COMPLETADA
```

---

## 🔍 Consultas Útiles

### Ver envíos de hoy:
```sql
SELECT * FROM control_envios_ips 
WHERE DATE(fecha_carga) = CURRENT_DATE;
```

### Ver advertencias del último proceso:
```typescript
// Las advertencias se retornan en el response del API
processResult.warnings.forEach(w => {
  console.log(`Línea ${w.line} - ${w.field}: ${w.issue}`);
});
```

### Restaurar desde backup:
```sql
DELETE FROM furips1;
INSERT INTO furips1 SELECT * FROM furips1_backup;
```

---

## 📝 Notas Importantes

1. **Backups automáticos:** Se crean antes de cada carga, preservando datos anteriores
2. **Validación exhaustiva:** Todos los tipos de datos son validados antes de insertar
3. **Advertencias no bloquean:** El sistema inserta lo que puede y advierte sobre ajustes
4. **Truncamiento transparente:** Si un campo es muy largo, se trunca y se advierte
5. **Formato de fechas flexible:** Acepta YYYY-MM-DD o DD/MM/YYYY
6. **Transaccionalidad:** Todo se procesa después de subir el ZIP exitosamente

---

## 🛡️ Seguridad

- Solo usuarios autenticados pueden cargar
- IPS solo pueden cargar sus propios códigos de habilitación
- Validación de unicidad de `idEnvio` por día
- Backups automáticos antes de cada operación destructiva
- Logs completos de advertencias y errores

---

## 📦 Almacenamiento (Cloudflare R2)

### Estructura de carpetas:
```
bioapp/
  └── {nombreIPS}/
      └── {YYYY-MM-DD}_{idEnvio}/
          ├── FURIPS1_xxx.txt
          ├── FURIPS2_xxx.txt
          ├── FURTRAN_xxx.txt  (opcional)
          └── soportes.zip
```

### Configuración (.env):
```env
R2_ACCOUNT_ID=tu_account_id
R2_ACCESS_KEY_ID=tu_access_key
R2_SECRET_ACCESS_KEY=tu_secret
R2_BUCKET_NAME=bioapp
```

---

## ✅ Estado del Sistema

**IMPLEMENTADO Y FUNCIONAL** ✅

Todas las funcionalidades están implementadas y listas para producción.
