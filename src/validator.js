// Validator: our ruleset that checks a compiled project.json is structurally
// sound before we hand a .sb3 to the user. Scratch has no official unit-test
// framework, so this is our safety net (complemented by loading into scratch-vm
// / TurboWarp for a runtime check).
//
// Returns { ok, errors, warnings }. Any error => the project is rejected.

import { CATALOG, MENU_OPCODES } from './catalog.js';

export function validate(project) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  if (!project || !Array.isArray(project.targets)) {
    return { ok: false, errors: ['project.targets is missing or not an array'], warnings };
  }

  const stages = project.targets.filter((t) => t.isStage);
  if (stages.length !== 1) err(`expected exactly 1 stage, found ${stages.length}`);
  const stage = stages[0];

  const varIds = new Set();
  const listIds = new Set();
  const broadcastIds = new Set();
  if (stage) {
    Object.keys(stage.variables || {}).forEach((id) => varIds.add(id));
    Object.keys(stage.lists || {}).forEach((id) => listIds.add(id));
    Object.keys(stage.broadcasts || {}).forEach((id) => broadcastIds.add(id));
  }

  const names = new Set();
  for (const t of project.targets) {
    if (names.has(t.name)) err(`duplicate target name: "${t.name}"`);
    names.add(t.name);
    if (!t.isStage && (!Array.isArray(t.costumes) || t.costumes.length === 0)) {
      err(`sprite "${t.name}" has no costumes`);
    }
    validateBlocks(t, { err, warn, varIds, listIds, broadcastIds });
  }

  return { ok: errors.length === 0, errors, warnings };
}

function checkPrimitive(prim, where, ctx) {
  // prim: [type, value, (id)]
  const type = prim[0];
  if (type === 12 && !ctx.varIds.has(prim[2])) ctx.err(`${where}: variable id "${prim[2]}" not declared`);
  if (type === 13 && !ctx.listIds.has(prim[2])) ctx.err(`${where}: list id "${prim[2]}" not declared`);
  if (type === 11 && !ctx.broadcastIds.has(prim[2])) ctx.err(`${where}: broadcast id "${prim[2]}" not declared`);
}

function validateBlocks(target, ctx) {
  const blocks = target.blocks || {};
  const ids = new Set(Object.keys(blocks));
  const tag = (id) => `${target.name}.${id} (${blocks[id] ? blocks[id].opcode : '?'})`;

  for (const [id, b] of Object.entries(blocks)) {
    const spec = CATALOG[b.opcode];
    if (!spec && !MENU_OPCODES.has(b.opcode)) {
      ctx.warn(`${tag(id)}: opcode not in catalog`);
    }

    if (b.parent != null && !ids.has(b.parent)) ctx.err(`${tag(id)}: parent "${b.parent}" missing`);
    if (b.next != null && !ids.has(b.next)) ctx.err(`${tag(id)}: next "${b.next}" missing`);

    if (b.topLevel) {
      if (typeof b.x !== 'number' || typeof b.y !== 'number') ctx.err(`${tag(id)}: top-level block missing x/y`);
    } else if (b.parent == null && !b.shadow) {
      ctx.warn(`${tag(id)}: non-top-level block has no parent (orphan)`);
    }

    for (const [name, inp] of Object.entries(b.inputs || {})) {
      const where = `${tag(id)} input ${name}`;
      if (!Array.isArray(inp)) { ctx.err(`${where}: malformed`); continue; }
      const shadowKind = inp[0]; // 1 same-shadow, 2 no-shadow, 3 obscured
      const refs = inp.slice(1);
      for (const ref of refs) {
        if (typeof ref === 'string') {
          if (!ids.has(ref)) ctx.err(`${where}: references missing block "${ref}"`);
        } else if (Array.isArray(ref)) {
          checkPrimitive(ref, where, ctx);
        }
      }
      if (shadowKind === 2 && !(typeof refs[0] === 'string')) {
        ctx.warn(`${where}: no-shadow input without a block`);
      }
    }

    for (const [name, fld] of Object.entries(b.fields || {})) {
      if (!Array.isArray(fld)) { ctx.err(`${tag(id)} field ${name}: malformed`); continue; }
      const fieldId = fld[1];
      if (fieldId != null) {
        if (!ctx.varIds.has(fieldId) && !ctx.listIds.has(fieldId) && !ctx.broadcastIds.has(fieldId)) {
          ctx.err(`${tag(id)} field ${name}: id "${fieldId}" not declared`);
        }
      }
    }
  }
}
