@echo off
REM Wrapper para el Scheduled Task del aviso diario de "Tu anio en discos"
REM (Ver docs/06-operations/year-invitations.md).
REM Fija el directorio de trabajo en la raiz del repo y ejecuta el envio via node + tsx,
REM sin depender de shims .CMD (pnpm) que el programador de tareas de Windows no resuelve bien.
cd /d "C:\Users\besan\Documents\Proyectos\music-platform"
REM logs\ esta ignorado por git: en un checkout nuevo no existe y la redireccion de abajo fallaria
REM antes de correr el script.
if not exist "logs" mkdir "logs"
"C:\nvm4w\nodejs\node.exe" "node_modules\tsx\dist\cli.mjs" --env-file=.env scripts/send-year-invitations.ts >> "C:\Users\besan\Documents\Proyectos\music-platform\logs\year-invitations.log" 2>&1
