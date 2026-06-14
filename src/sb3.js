// Assemble a full .sb3: bundle default assets, compile the IR, validate, and
// zip it all up. Works identically in the browser and in Node.

import { writeZip } from './zip.js';
import { md5 } from './md5.js';
import { COSTUME_SVG, BACKDROP_SVG } from './assets.js';
import { compile, normalizeIR } from './compiler.js';
import { validate } from './validator.js';

const enc = new TextEncoder();

function svgAsset(svg, name, rcx, rcy) {
  const bytes = enc.encode(svg);
  const hash = md5(bytes);
  return {
    costume: {
      name,
      dataFormat: 'svg',
      assetId: hash,
      md5ext: hash + '.svg',
      rotationCenterX: rcx,
      rotationCenterY: rcy,
    },
    asset: { name: hash + '.svg', bytes },
  };
}

// Compile IR -> { project, report, assets } without zipping (handy for tests).
export function buildProject(ir) {
  const sprite = svgAsset(COSTUME_SVG, 'costume1', 50, 50);
  const backdrop = svgAsset(BACKDROP_SVG, 'backdrop1', 240, 180);
  const project = compile(normalizeIR(ir), {
    spriteCostume: sprite.costume,
    backdropCostume: backdrop.costume,
  });
  const report = validate(project);
  return { project, report, assets: [sprite.asset, backdrop.asset] };
}

// Compile IR -> { bytes (Uint8Array .sb3), report, project }.
export function buildSb3(ir) {
  const { project, report, assets } = buildProject(ir);
  const entries = [{ name: 'project.json', bytes: enc.encode(JSON.stringify(project)) }];
  const seen = new Set();
  for (const a of assets) {
    if (!seen.has(a.name)) { seen.add(a.name); entries.push({ name: a.name, bytes: a.bytes }); }
  }
  return { bytes: writeZip(entries), report, project };
}
