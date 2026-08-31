@echo off
REM Wrapper para el Scheduled Task de backup diario (Ver docs/06-operations/backup-restore.md).
REM Fija el directorio de trabajo en la raiz del repo y ejecuta el backup via node + tsx,
REM sin depender de shims .CMD (pnpm) que el programador de tareas de Windows no resuelve bien.
cd /d "C:\Users\besan\Documents\Proyectos\music-platform"
"C:\nvm4w\nodejs\node.exe" "node_modules\tsx\dist\cli.mjs" --env-file=.env scripts/backup-db.ts >> "C:\Users\besan\Documents\Proyectos\music-platform\backups\backup.log" 2>&1
