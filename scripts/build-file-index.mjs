/**
 * Build-time script: reads source files referenced by the IDE FunctionTree
 * and writes them to public/file-contents.json so the IDE works in static export.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

const TREE_PATHS = [
  'app/page.tsx',
  'components/login/login-card.tsx',
  'components/chat/support-chat.tsx',
  'app/api/ai/validate-login/route.ts',
  'app/api/ai/identity-verify/route.ts',
  'app/panel/page.tsx',
  'app/panel/rrhh/page.tsx',
  'components/rrhh/employee-form-modal.tsx',
  'app/panel/it-manager/page.tsx',
  'components/it-manager/support-queue.tsx',
  'components/it-manager/it-manager-chat.tsx',
  'app/panel/it-manager/usuarios/page.tsx',
  'components/it-manager/user-form-modal.tsx',
  'app/panel/it-manager/ide/page.tsx',
  'app/panel/it-manager/inventario/page.tsx',
  'components/inventario/equipment-form-modal.tsx',
  'components/inventario/qr-label.tsx',
  'components/inventario/reinspection-modal.tsx',
  'components/inventario/monthly-inspection-report.tsx',
  'components/ide/function-tree.tsx',
  'components/ide/code-editor.tsx',
  'components/ide/preview-panel.tsx',
  'components/ide/toolbox.tsx',
  'components/ide/ai-assistant.tsx',
  'components/rrhh/photo-cropper.tsx',
  'components/rrhh/employee-form-modal.tsx',
  'components/qa-reports/weekly-issues.tsx',
  'components/panel/welcome-screen.tsx',
  'components/it-manager/validation-panel.tsx',
  'components/it-manager/user-form-modal.tsx',
  'components/it-manager/support-queue.tsx',
  'components/it-manager/it-manager-chat.tsx',
  'components/it-manager/support-notifications.tsx',
  'lib/firebase.ts',
  'lib/ai-prompts.ts',
  'lib/utils.ts',
  'lib/auth-store.ts',
  'lib/alarm-engine.ts',
  'lib/person-segmentation.ts',
  'components/ui/button.tsx',
  'components/ui/input.tsx',
  'components/ui/card.tsx',
  'components/ui/dialog.tsx',
  'components/ui/form.tsx',
  'components/ui/table.tsx',
  'components/ui/tabs.tsx',
  'components/ui/select.tsx',
  'components/ui/checkbox.tsx',
  'components/ui/switch.tsx',
  'components/ui/avatar.tsx',
  'components/ui/badge.tsx',
  'components/ui/textarea.tsx',
  'components/ui/scroll-area.tsx',
  'components/ui/resizable.tsx',
  'components/ui/label.tsx',
  'components/ui/separator.tsx',
  'components/ui/progress.tsx',
  'components/ui/skeleton.tsx',
  'components/ui/slider.tsx',
  'components/ui/toast.tsx',
  'components/ui/tooltip.tsx',
  'components/ui/popover.tsx',
  'components/ui/dropdown-menu.tsx',
  'next.config.mjs',
  'package.json',
];

const contents = {};

for (const relPath of TREE_PATHS) {
  const absPath = join(ROOT, relPath);
  try {
    if (existsSync(absPath)) {
      contents[relPath] = readFileSync(absPath, 'utf-8');
    } else {
      contents[relPath] = `// ${relPath} — file not found at build time`;
    }
  } catch {
    contents[relPath] = `// ${relPath} — error reading file`;
  }
}

const outPath = join(ROOT, 'public', 'file-contents.json');
writeFileSync(outPath, JSON.stringify(contents), 'utf-8');
console.log(`[build-file-index] Wrote ${Object.keys(contents).length} files to ${outPath}`);
