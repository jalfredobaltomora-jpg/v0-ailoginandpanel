const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
  console.log('✅ sharp loaded');
} catch (e) {
  console.warn('⚠ sharp not available:', String(e));
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const logoPaths = [
  path.join(__dirname, '..', 'JB - SCA.png'),
  path.join(__dirname, '..', 'logo.png'),
  path.join(__dirname, '..', 'icon.png'),
  path.join(__dirname, '..', 'public', 'icon.png'),
];
const srcPath = logoPaths.find(p => fs.existsSync(p));

const sizes = [
  { file: 'icon-light-32x32.png', w: 32, h: 32 },
  { file: 'icon-dark-32x32.png', w: 32, h: 32 },
  { file: 'icon-192x192.png', w: 192, h: 192 },
  { file: 'icon-512x512.png', w: 512, h: 512 },
  { file: 'apple-icon.png', w: 180, h: 180 },
];

async function main() {
  if (!sharp || !srcPath) {
    console.warn(`⚠ No se pueden generar iconos (sharp: ${!!sharp}, logo: ${!!srcPath}). Verificando existentes...`);
    let ok = 0;
    for (const s of sizes) {
      const fp = path.join(publicDir, s.file);
      if (fs.existsSync(fp)) ok++;
    }
    if (ok === sizes.length) {
      console.log(`✅ ${ok}/${sizes.length} iconos ya existen, continuando.`);
      return;
    }
    console.warn(`⚠ Solo ${ok}/${sizes.length} iconos existen. El build puede continuar, los PWA usarán fallback.`);
    return;
  }

  console.log(`📸 Usando logo: ${srcPath}`);
  for (const s of sizes) {
    const fp = path.join(publicDir, s.file);
    await sharp(srcPath)
      .resize(s.w, s.h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(fp);
    const kb = (fs.statSync(fp).size / 1024).toFixed(1);
    console.log(`  ${s.file} (${s.w}x${s.h}) ${kb}KB`);
  }
  console.log('✅ Iconos PWA generados');
}

main().catch((e) => {
  console.warn('⚠ Error generando iconos (no crítico):', e.message);
});
