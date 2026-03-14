import fs from 'node:fs';
import path from 'node:path';

const srcDir = path.resolve(process.cwd(), '..', 'android_ui', 'dist');
const dstDir = path.resolve(process.cwd(), 'www');

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, dstPath);
    else if (entry.isFile()) fs.copyFileSync(srcPath, dstPath);
  }
}

if (!fs.existsSync(srcDir)) {
  console.error(`Dist introuvable: ${srcDir}`);
  console.error('Lance d’abord: npm --prefix ../android_ui run build');
  process.exit(1);
}

rmrf(dstDir);
copyDir(srcDir, dstDir);
console.log(`Web assets copiés: ${srcDir} -> ${dstDir}`);

