// Compiler: high-level IR -> Scratch 3 project.json object.
//
// IR shape (any of these forms is accepted; normalizeIR canonicalizes them):
//
//   { scripts: [ [ {op,...}, ... ], ... ] }                  // one sprite
//   { sprites: [ {name, x, y, scripts:[...]}, ... ] }        // many sprites
//   { targets: [ {name,isStage,scripts:[...]}, ... ] }       // full control
//   { variables: { score: 0 }, sprites: [...] }              // declare globals
//
// A "script" is an array of IR blocks. The first block is usually a hat.
// An IR block:
//   { op: 'motion_movesteps', inputs: { STEPS: 10 } }
//   { op: 'control_repeat', inputs: { TIMES: 4 }, body: [ ...blocks ] }
//   { op: 'control_if_else', inputs:{CONDITION:{op:'sensing_mousedown'}},
//     body:[...], body2:[...] }
//
// Input values may be:
//   a literal     -> 10, "Hello", "#ff0000"
//   a nested block-> { op: 'operator_add', inputs: { NUM1: 1, NUM2: 2 } }
//   a variable    -> { var: 'score' }
//   a list        -> { list: 'queue' }

import { CATALOG, SHADOW_PRIM } from './catalog.js';

function newId(ctx) { return 'b' + ++ctx.n; }

function getVarId(ctx, name) {
  if (!ctx.vars.has(name)) ctx.vars.set(name, { id: 'var-' + ctx.vars.size, init: 0 });
  return ctx.vars.get(name).id;
}
function getListId(ctx, name) {
  if (!ctx.lists.has(name)) ctx.lists.set(name, { id: 'list-' + ctx.lists.size, init: [] });
  return ctx.lists.get(name).id;
}
function getBroadcastId(ctx, name) {
  if (!ctx.broadcasts.has(name)) ctx.broadcasts.set(name, 'bc-' + ctx.broadcasts.size);
  return ctx.broadcasts.get(name);
}

function isBlockSpec(v) {
  return v && typeof v === 'object' && !Array.isArray(v) && 'op' in v;
}

// Resolve an input value into either a primitive array or a child block id.
function compileOperand(ctx, value, parentId, blocks) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if ('var' in value) return { prim: [12, String(value.var), getVarId(ctx, value.var)] };
    if ('list' in value) return { prim: [13, String(value.list), getListId(ctx, value.list)] };
    if ('op' in value) return { block: compileBlock(ctx, value, parentId, blocks, false) };
  }
  return { literal: value };
}

function defaultLiteralFor(kind) {
  return kind === 'colour' ? '#ff0000' : '';
}

function buildInput(ctx, parentId, spec, value, blocks) {
  const kind = spec.kind;

  if (kind === 'bool') {
    if (value == null) return undefined; // empty hexagon -> omit input
    const r = compileOperand(ctx, value, parentId, blocks);
    return r.block ? [2, r.block] : undefined;
  }

  if (kind === 'menu') {
    const menuId = newId(ctx);
    blocks[menuId] = {
      opcode: spec.op,
      next: null,
      parent: parentId,
      inputs: {},
      fields: { [spec.field]: [String(value != null ? value : spec.default), null] },
      shadow: true,
      topLevel: false,
    };
    return [1, menuId];
  }

  if (kind === 'broadcast') {
    const name = String(value != null ? value : 'message1');
    return [1, [11, name, getBroadcastId(ctx, name)]];
  }

  // Value slot backed by a shadow primitive (number/text/angle/colour/...).
  const primType = SHADOW_PRIM[kind];
  const r = compileOperand(ctx, value, parentId, blocks);

  if (r.block !== undefined) return [3, r.block, [primType, defaultLiteralFor(kind)]];
  if (r.prim !== undefined) return [3, r.prim, [primType, defaultLiteralFor(kind)]];

  const lit = r.literal != null ? r.literal : spec.default;
  return [1, [primType, lit == null ? '' : String(lit)]];
}

function buildField(ctx, fspec, value) {
  if (fspec.kind === 'variable') {
    const name = String(value != null ? value : 'my variable');
    return [name, getVarId(ctx, name)];
  }
  if (fspec.kind === 'broadcast') {
    const name = String(value != null ? value : 'message1');
    return [name, getBroadcastId(ctx, name)];
  }
  return [String(value != null ? value : fspec.default), null];
}

function compileBlock(ctx, ir, parentId, blocks, isTop) {
  const spec = CATALOG[ir.op];
  if (!spec) throw new Error('Unknown opcode: "' + ir.op + '"');

  const id = newId(ctx);
  const block = {
    opcode: ir.op,
    next: null,
    parent: parentId,
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: !!isTop,
  };
  if (isTop) { block.x = ir.x != null ? ir.x : 0; block.y = ir.y != null ? ir.y : 0; }

  if (spec.fields) {
    for (const [fn, fspec] of Object.entries(spec.fields)) {
      block.fields[fn] = buildField(ctx, fspec, ir.fields ? ir.fields[fn] : undefined);
    }
  }

  if (spec.inputs) {
    for (const [name, inSpec] of Object.entries(spec.inputs)) {
      const v = ir.inputs ? ir.inputs[name] : undefined;
      const built = buildInput(ctx, id, inSpec, v, blocks);
      if (built !== undefined) block.inputs[name] = built;
    }
  }

  if (spec.substacks) {
    const bodies = { SUBSTACK: ir.body, SUBSTACK2: ir.body2 };
    for (const sub of spec.substacks) {
      const arr = bodies[sub];
      if (Array.isArray(arr) && arr.length) {
        block.inputs[sub] = [2, compileSequence(ctx, arr, id, blocks)];
      }
    }
  }

  if (ir.op === 'control_stop') {
    const opt = block.fields.STOP_OPTION ? block.fields.STOP_OPTION[0] : 'all';
    block.mutation = {
      tagName: 'mutation',
      children: [],
      hasnext: opt === 'other scripts in sprite' ? 'true' : 'false',
    };
  }

  blocks[id] = block;
  return id;
}

// Compile an ordered list of stack blocks; returns the id of the first.
function compileSequence(ctx, arr, parentId, blocks) {
  let firstId = null, prevId = null;
  arr.forEach((irb, i) => {
    const isTop = parentId === null && i === 0;
    const id = compileBlock(ctx, irb, i === 0 ? parentId : prevId, blocks, isTop);
    if (i === 0) firstId = id;
    if (prevId !== null) blocks[prevId].next = id;
    prevId = id;
  });
  return firstId;
}

export function normalizeIR(ir) {
  let targets;
  if (Array.isArray(ir.targets)) {
    targets = ir.targets.slice();
    if (!targets.some((t) => t.isStage)) {
      targets.unshift({ name: 'Stage', isStage: true, scripts: [] });
    }
  } else if (Array.isArray(ir.sprites)) {
    targets = [{ name: 'Stage', isStage: true, scripts: [] }, ...ir.sprites];
  } else {
    targets = [
      { name: 'Stage', isStage: true, scripts: [] },
      { name: 'Sprite1', isStage: false, scripts: ir.scripts || [] },
    ];
  }
  return { targets, variables: ir.variables || {}, lists: ir.lists || {} };
}

function makeTarget(t, blocks, opts, layerOrder) {
  const isStage = !!t.isStage;
  const base = {
    isStage,
    name: t.name || (isStage ? 'Stage' : 'Sprite'),
    variables: {},
    lists: {},
    broadcasts: {},
    blocks,
    comments: {},
    currentCostume: 0,
    costumes: [isStage ? opts.backdropCostume : opts.spriteCostume],
    sounds: [],
    volume: 100,
    layerOrder,
  };
  if (isStage) {
    return Object.assign(base, {
      tempo: 60,
      videoTransparency: 50,
      videoState: 'on',
      textToSpeechLanguage: null,
    });
  }
  return Object.assign(base, {
    visible: t.visible !== false,
    x: t.x != null ? t.x : 0,
    y: t.y != null ? t.y : 0,
    size: t.size != null ? t.size : 100,
    direction: t.direction != null ? t.direction : 90,
    draggable: !!t.draggable,
    rotationStyle: t.rotationStyle || 'all around',
  });
}

function normalizeScripts(t) {
  // Accept scripts as [[block,...]] or [{blocks:[block,...]}].
  return (t.scripts || []).map((s) => (Array.isArray(s) ? s : s.blocks || []));
}

export function compile(normIr, opts) {
  const ctx = { n: 0, vars: new Map(), broadcasts: new Map(), lists: new Map() };

  for (const [name, init] of Object.entries(normIr.variables || {})) {
    getVarId(ctx, name);
    ctx.vars.get(name).init = init;
  }
  for (const [name, init] of Object.entries(normIr.lists || {})) {
    getListId(ctx, name);
    ctx.lists.get(name).init = Array.isArray(init) ? init : [];
  }

  const targets = [];
  let spriteLayer = 1;
  for (const t of normIr.targets) {
    const blocks = {};
    for (const script of normalizeScripts(t)) {
      if (script.length) compileSequence(ctx, script, null, blocks);
    }
    const layer = t.isStage ? 0 : spriteLayer++;
    targets.push(makeTarget(t, blocks, opts, layer));
  }

  const stage = targets.find((x) => x.isStage);
  for (const [name, info] of ctx.vars) stage.variables[info.id] = [name, info.init];
  for (const [name, info] of ctx.lists) stage.lists[info.id] = [name, info.init];
  for (const [name, id] of ctx.broadcasts) stage.broadcasts[id] = name;

  return {
    targets,
    monitors: [],
    extensions: [],
    meta: { semver: '3.0.0', vm: '0.2.0', agent: 'Scratch GPT 0.1' },
  };
}
