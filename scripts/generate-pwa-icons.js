const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// Look for logo in project root or user-provided path
const logoPaths = [
  path.join(__dirname, '..', 'JB - SCA.png'),
  path.join(__dirname, '..', 'logo.png'),
  path.join(__dirname, '..', 'icon.png'),
  path.join(__dirname, '..', 'public', 'icon.png'),
];
const srcPath = logoPaths.find(p => fs.existsSync(p));

if (!srcPath) {
  console.error('❌ No se encontró archivo de logo. Busqué:', logoPaths.join(', '));
  process.exit(1);
}

console.log(`📸 Usando logo: ${srcPath}`);

const sizes = [
  { file: 'icon-light-32x32.png', w: 32, h: 32 },
  { file: 'icon-dark-32x32.png', w: 32, h: 32 },
  { file: 'icon-192x192.png', w: 192, h: 192 },
  { file: 'icon-512x512.png', w: 512, h: 512 },
  { file: 'apple-icon.png', w: 180, h: 180 },
];

async function main() {
  for (const s of sizes) {
    const fp = path.join(publicDir, s.file);
    await sharp(srcPath)
      .resize(s.w, s.h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(fp);
    const kb = (fs.statSync(fp).size / 1024).toFixed(1);
    console.log(`  ${s.file} (${s.w}x${s.h}) ${kb}KB`);
  }
  console.log('✅ Iconos PWA generados desde el logo original');
}

main().catch((e) => {
  console.error('❌ Error generando iconos:', e.message);
  process.exit(1);
});
