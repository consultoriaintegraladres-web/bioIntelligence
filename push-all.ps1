# Script para hacer push a ambos remotes de GitHub
# Uso: .\push-all.ps1 [mensaje de commit]
#
# NOTA: Para que funcione con ambos remotes, necesitas configurar tokens:
# 1. bioIntelligence ya está configurado con token de consultoriaintegraladres@gmail.com
# 2. origin necesita token de auditoriabioretail@gmail.com
#    Configurar con: git remote set-url origin https://USERNAME:TOKEN@github.com/auditoriabioretail-cell/reportes_ips.git

param(
    [string]$commitMessage = "Update: cambios automáticos"
)

Write-Host "🚀 Iniciando push a ambos remotes..." -ForegroundColor Cyan

# Verificar que hay cambios para commitear
$status = git status --porcelain
if ($status) {
    Write-Host "📝 Agregando cambios al staging..." -ForegroundColor Yellow
    git add .
    
    Write-Host "💾 Creando commit: $commitMessage" -ForegroundColor Yellow
    git commit -m $commitMessage
} else {
    Write-Host "⚠️ No hay cambios para commitear" -ForegroundColor Yellow
}

# Push a bioIntelligence (consultoriaintegraladres-web/bioIntelligence)
Write-Host "`n📤 Pusheando a bioIntelligence (consultoriaintegraladres-web/bioIntelligence)..." -ForegroundColor Green
git push bioIntelligence main
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Push a bioIntelligence exitoso" -ForegroundColor Green
} else {
    Write-Host "❌ Error al pushear a bioIntelligence" -ForegroundColor Red
    Write-Host "   Verifica que el token esté configurado correctamente" -ForegroundColor Yellow
}

# Push a origin (auditoriabioretail-cell/reportes_ips)
Write-Host "`n📤 Pusheando a origin (auditoriabioretail-cell/reportes_ips)..." -ForegroundColor Green
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Push a origin exitoso" -ForegroundColor Green
} else {
    Write-Host "❌ Error al pushear a origin" -ForegroundColor Red
    Write-Host "   Necesitas configurar el token de auditoriabioretail@gmail.com" -ForegroundColor Yellow
    Write-Host "   Ejecuta: git remote set-url origin https://USERNAME:TOKEN@github.com/auditoriabioretail-cell/reportes_ips.git" -ForegroundColor Yellow
}

Write-Host "`n✨ Proceso completado" -ForegroundColor Cyan
