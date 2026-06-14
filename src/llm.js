// Natural-language description -> IR JSON.
//
// No keys are bundled or stored in the browser. The app is served BY the Apps
// Script web app (gated by Google sign-in + an allowlist), so generation goes
// through google.script.run to a server function that holds the provider key in
// Script Properties. On localhost (served statically) there is no backend, so
// generation is unavailable — author the IR by hand and the compiler does the rest.

import { CATALOG } from './catalog.js';

// Compact, model-friendly description of every block the compiler understands.
export function catalogReference() {
  const byCat = {};
  for (const [op, spec] of Object.entries(CATALOG)) {
    const cat = spec.category || 'other';
    const ins = spec.inputs ? Object.entries(spec.inputs).map(([k, v]) => `${k}:${v.kind}`).join(', ') : '';
    const flds = spec.fields ? Object.entries(spec.fields).map(([k, v]) => `${k}:${v.kind}`).join(', ') : '';
    const subs = spec.substacks ? ` body${spec.substacks.length > 1 ? '+body2' : ''}` : '';
    let line = `  ${op} [${spec.type}]`;
    if (ins) line += ` inputs(${ins})`;
    if (flds) line += ` fields(${flds})`;
    if (subs) line += subs;
    (byCat[cat] ||= []).push(line);
  }
  return Object.entries(byCat)
    .map(([cat, lines]) => `# ${cat}\n${lines.join('\n')}`)
    .join('\n');
}

export function systemPrompt() {
  return `You are Scratch GPT's compiler front-end. Convert the user's description of a
program into IR JSON that compiles to a Scratch 3 project. Output ONLY a single
JSON object, no prose, no markdown fences.

IR shape:
{
  "variables": { "score": 0 },              // optional global variables
  "lists": { "queue": [] },                  // optional global lists
  "sprites": [
    {
      "name": "Cat", "x": 0, "y": 0,         // x/y/size/direction optional
      "scripts": [                            // array of scripts
        [                                     // a script = array of blocks
          { "op": "event_whenflagclicked" },  // first block is usually a hat
          { "op": "control_forever", "body": [
            { "op": "motion_movesteps", "inputs": { "STEPS": 10 } }
          ] }
        ]
      ]
    }
  ]
}

Rules:
- Every block has "op". "inputs" maps input name -> value. "fields" maps field
  name -> value. C-blocks (control_repeat/if/forever/...) put child blocks in
  "body" (and "body2" for the else branch of control_if_else).
- An input value is: a literal (10, "hi", "#ff0000"); a nested reporter/boolean
  block { "op": ... }; a variable { "var": "score" }; or a list { "list": "q" }.
- Boolean (hexagon) inputs only accept boolean blocks (operator_gt, operator_and,
  sensing_..., etc.). Reporter (round) blocks go in value slots.
- Use ONLY the opcodes listed below, with their listed input/field names.
- Keep it runnable: start scripts with a hat (event_whenflagclicked, etc.).

Available blocks:
${catalogReference()}`;
}

function extractJson(text) {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in model output');
  return JSON.parse(t.slice(start, end + 1));
}

// settings: { provider: 'openai'|'anthropic', model }
// The API key is NOT here — it lives in the Apps Script Script Properties.
// Calls the server-side `generate(payload)` function via google.script.run.
export function describeToIR(description, settings) {
  return new Promise((resolve, reject) => {
    const gsr = typeof google !== 'undefined' && google.script && google.script.run;
    if (!gsr) {
      reject(new Error('Generation runs in the deployed Apps Script app. On localhost, edit the IR by hand.'));
      return;
    }
    google.script.run
      .withSuccessHandler((text) => {
        try { resolve(extractJson(text)); }
        catch (e) { reject(new Error('Model did not return valid IR JSON: ' + e.message)); }
      })
      .withFailureHandler((err) => reject(new Error((err && err.message) || 'Generation failed.')))
      .generate({
        provider: (settings && settings.provider) || '', // '' = auto (Anthropic preferred)
        model: (settings && settings.model) || '',
        system: systemPrompt(),
        user: description,
      });
  });
}
