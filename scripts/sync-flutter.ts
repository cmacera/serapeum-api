/**
 * sync-flutter.ts
 *
 * Copies the generated docs/openapi.yaml to the serapeum-app Flutter project.
 * Run via: npm run sync:flutter (which first runs generate:openapi)
 *
 * Override the default Flutter project path with:
 *   FLUTTER_PROJECT_PATH=/path/to/serapeum-app npm run sync:flutter
 */

import { copyFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const src = resolve(__dirname, '../docs/openapi.yaml');
const flutterRoot = process.env['FLUTTER_PROJECT_PATH'] ?? resolve(__dirname, '../../serapeum-app');
const dest = resolve(flutterRoot, 'docs/openapi.yaml');

if (!existsSync(flutterRoot)) {
  console.error(`❌ Flutter project not found at: ${flutterRoot}`);
  console.error('   Set FLUTTER_PROJECT_PATH env var to the correct path.');
  process.exit(1);
}

if (!existsSync(src)) {
  console.error(`❌ Source spec not found at: ${src}`);
  console.error('   Run "npm run generate:openapi" first.');
  process.exit(1);
}

copyFileSync(src, dest);
console.log(`✅ OpenAPI spec synced to: ${dest}`);
