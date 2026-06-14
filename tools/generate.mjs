#!/usr/bin/env node
// CLI: compile an IR JSON file into a .sb3.
//   node tools/generate.mjs <ir.json> [out.sb3]
//
// Used to turn a prompt -> IR -> downloadable .sb3 from the terminal (and by
// Scratch GPT's chat-driven workflow until the web API keys are wired up).

import { readFileSync, writeFileSync } from 'node:fs';
import { buildSb3 } from '../src/sb3.js';

const irPath = process.argv[2];
if (!irPath) {
  console.error('usage: node tools/generate.mjs <ir.json> [out.sb3]');
  process.exit(2);
}
const outPath = process.argv[3] || irPath.replace(/\.json$/i, '') + '.sb3';

let ir;
try {
  ir = JSON.parse(readFileSync(irPath, 'utf8'));
} catch (e) {
  console.error('Failed to read/parse IR:', e.message);
  process.exit(2);
}

let result;
try {
  result = buildSb3(ir);
} catch (e) {
  console.error('Compile error:', e.message);
  process.exit(1);
}

const { bytes, report } = result;
if (report.warnings.length) {
  console.warn('Warnings:');
  for (const w of report.warnings) console.warn('  - ' + w);
}
if (!report.ok) {
  console.error('VALIDATION FAILED:');
  for (const m of report.errors) console.error('  - ' + m);
  process.exit(1);
}

writeFileSync(outPath, Buffer.from(bytes));
console.log(`OK  ${outPath}  (${bytes.length} bytes, ${result.project.targets.length} targets)`);
