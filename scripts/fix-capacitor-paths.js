const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');
const OLD = '/v0-ailoginandpanel';

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.html$/.test(e.name)) {
      let content = fs.readFileSync(full, 'utf-8');
      // Replace /v0-ailoginandpanel/path → /path (root-relative)
      if (content.includes(OLD)) {
        content = content.replaceAll(OLD, '');
        content = content.replaceAll('..//', '//');
      }
      // Add <base href="/"> so all ./ paths resolve from root
      content = content.replace('<head>', '<head><base href="/"/>');
      fs.writeFileSync(full, content);
    } else if (/\.(js|css|json|txt)$/.test(e.name)) {
      let content = fs.readFileSync(full, 'utf-8');
      if (content.includes(OLD)) {
        content = content.replaceAll(OLD, '');
        content = content.replaceAll('..//', '//');
        fs.writeFileSync(full, content);
      }
    }
  }
}

walk(outDir);
console.log('✅ BasePath convertido a rutas absolutas + <base href="/"> en out/');
