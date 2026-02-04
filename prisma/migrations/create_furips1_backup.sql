-- Crear tabla furips1_backup (si no existe)
CREATE TABLE IF NOT EXISTS `furips1_backup` LIKE `furips1`;

-- Verificar que las tablas de backup existen
CREATE TABLE IF NOT EXISTS `FURTRAN_backup` LIKE `FURTRAN`;
