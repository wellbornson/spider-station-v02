@echo off
echo Starting build process...
cd /d "C:\Users\wellbornsonAi\Desktop\click-new\click"
echo Current directory: %cd%
echo Running next build...
npx next build --webpack > build_log.txt 2>&1
echo Build completed with exit code: %ERRORLEVEL%
echo Check build_log.txt for details
type build_log.txt