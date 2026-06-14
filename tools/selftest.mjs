#!/usr/bin/env node
// Self-test: compile several IRs, assert they validate, and sanity-check that
// the produced .sb3 is a readable ZIP whose project.json round-trips.
//
//   node tools/selftest.mjs

import { buildSb3, buildProject } from '../src/sb3.js';

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok  - ' + name); }
  else { fail++; console.error('  FAIL- ' + name + (detail ? ': ' + detail : '')); }
};

// 1. A simple animation loop.
const dance = {
  variables: { steps: 0 },
  sprites: [{
    name: 'Dancer', x: 0, y: 0,
    scripts: [[
      { op: 'event_whenflagclicked' },
      { op: 'control_forever', body: [
        { op: 'motion_movesteps', inputs: { STEPS: 10 } },
        { op: 'motion_ifonedgebounce' },
        { op: 'control_wait', inputs: { DURATION: 0.2 } },
        { op: 'data_changevariableby', fields: { VARIABLE: 'steps' }, inputs: { VALUE: 1 } },
      ] },
    ]],
  }],
};

// 2. Nested operators, conditionals, broadcasts, variables as inputs.
const quiz = {
  variables: { score: 0 },
  sprites: [{
    name: 'Cat',
    scripts: [
      [
        { op: 'event_whenflagclicked' },
        { op: 'data_setvariableto', fields: { VARIABLE: 'score' }, inputs: { VALUE: 0 } },
        { op: 'sensing_askandwait', inputs: { QUESTION: 'What is 2 + 2?' } },
        { op: 'control_if_else',
          inputs: { CONDITION: { op: 'operator_equals', inputs: { OPERAND1: { op: 'sensing_answer' }, OPERAND2: 4 } } },
          body: [
            { op: 'data_changevariableby', fields: { VARIABLE: 'score' }, inputs: { VALUE: 1 } },
            { op: 'looks_sayforsecs', inputs: { MESSAGE: 'Correct!', SECS: 2 } },
            { op: 'event_broadcast', inputs: { BROADCAST_INPUT: 'win' } },
          ],
          body2: [
            { op: 'looks_sayforsecs', inputs: { MESSAGE: { op: 'operator_join', inputs: { STRING1: 'Score: ', STRING2: { var: 'score' } } }, SECS: 2 } },
          ],
        },
      ],
      [
        { op: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: 'win' } },
        { op: 'looks_changesizeby', inputs: { CHANGE: 50 } },
      ],
    ],
  }],
};

for (const [name, ir] of [['dance', dance], ['quiz', quiz]]) {
  const { project, report } = buildProject(ir);
  ok(`${name}: validates`, report.ok, report.errors.join('; '));
  ok(`${name}: warning-free`, report.warnings.length === 0, report.warnings.join('; '));
  ok(`${name}: has a stage`, project.targets.some((t) => t.isStage));

  const { bytes } = buildSb3(ir);
  ok(`${name}: zip starts with PK`, bytes[0] === 0x50 && bytes[1] === 0x4b);

  // Round-trip project.json out of the stored zip by locating the entry.
  const txt = Buffer.from(bytes).toString('latin1');
  const start = txt.indexOf('{"targets"');
  const end = txt.lastIndexOf('}}') + 2;
  let parsed = null;
  try { parsed = JSON.parse(Buffer.from(bytes).slice(start, end).toString('utf8')); } catch (e) { /* */ }
  ok(`${name}: project.json round-trips`, parsed && Array.isArray(parsed.targets));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
