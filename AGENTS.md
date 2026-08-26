# AGENTS.md - Instrucciones para el asistente

## Reglas generales

1. **Siempre que se hagan cambios en el código**, después de verificar que funcionan:
   - Hacer commit y push a GitHub
   - Crear la APK con `set CAPACITOR_BUILD=1 && npm run build`, luego `npx cap sync android`, luego gradle `clean assembleDebug`
   - Copiar el APK a `C:\Users\print\Desktop\app-debug.apk`

2. **No subir archivos sensibles** (contraseñas, tokens, API keys) al repositorio.

3. **JAVA_HOME** debe estar configurado a `C:\Program Files\Android\Android Studio\jbr` para builds de Android.
