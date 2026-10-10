@echo off
title Compilar PriceBook Release APK Local
color 0B
echo ==============================================================
echo    Compilando PriceBook APK en modo Release (Optimizado)
echo ==============================================================
echo.

set JAVA_HOME=C:\Program Files\Java\jdk-17
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%

if not exist "%~dp0android" (
  echo [*] Generando estructura nativa con expo prebuild...
  call npx expo prebuild --platform android --no-install
)

subst P: /d >nul 2>&1
subst P: "%~dp0.."

cd /d "P:\PriceBook\android"
echo [*] Compilando APK Release solo para ARM64 con cache...
call gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a" --build-cache --parallel
set BUILD_ERR=%ERRORLEVEL%

if %BUILD_ERR% EQU 0 (
  echo.
  echo [OK] Compilacion exitosa. Copiando a Mobile Drop...
  copy /y "P:\PriceBook\android\app\build\outputs\apk\release\app-release.apk" "C:\Users\agust\Documents\Mobile Drop\PriceBook-latest.apk" >nul
  copy /y "P:\PriceBook\android\app\build\outputs\apk\release\app-release.apk" "C:\Users\agust\Documents\Mobile Drop\PriceBook-v1.0.3.apk" >nul
  echo [OK] APK copiado en: C:\Users\agust\Documents\Mobile Drop\PriceBook-v1.0.3.apk
) else (
  echo.
  echo [ERROR] Fallo la compilacion. Revisa los logs arriba.
)

cd /d "%~dp0"
subst P: /d >nul 2>&1

echo.
pause
