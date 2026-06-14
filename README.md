# Scratch GPT

Turn a high-level description of a program into a valid Scratch 3 project
(`.sb3`) you can open in the [Scratch editor](https://scratch.mit.edu/projects/editor/)
or [TurboWarp](https://turbowarp.org/).

## How it works

```
description ──(LLM)──▶ IR JSON ──(compiler)──▶ project.json ──(validate + zip)──▶ .sb3
```

The LLM never writes raw Scratch JSON (which is verbose and error-prone).
Instead it emits a small **intermediate representation (IR)**, and a
**deterministic compiler** turns that into a correct `project.json`. Every
build is checked by our **validator** before a file is produced, so output is
reliably valid.

- `src/catalog.js` — the set of Scratch blocks we know (the "syntax"). Add a
  block here to teach Scratch GPT a new opcode; nothing else changes.
- `src/compiler.js` — IR → `project.json`.
- `src/validator.js` — our ruleset (id integrity, block references, etc.).
- `src/zip.js`, `src/md5.js` — dependency-free `.sb3` packaging.
- `src/sb3.js` — ties it together: `buildSb3(ir) → { bytes, report, project }`.
- `src/llm.js` — description → IR via OpenAI or Anthropic.
- `index.html` + `src/app.js` — the web UI.

## Run the web UI

In VS Code: **Run → Run Scratch GPT (Chrome)** (starts a local server on
`http://localhost:4825/` and opens Chrome). Or manually:

```sh
npm run serve      # python3 -m http.server 4825
```

The UI works without an API key — paste/edit IR JSON and click
**Build & Download .sb3**. Add an OpenAI/Anthropic key under **Settings** to
generate IR from plain-English descriptions.

> ⚠️ Browser-side API calls expose your key to the page. Fine for local
> testing; for hosting, proxy the call through your own server.

## Generate from the command line

```sh
node tools/generate.mjs examples/dance.json out.sb3
```

## Test

```sh
npm test           # node tools/selftest.mjs
```

Compiles sample IRs, asserts they validate, and checks the produced `.sb3` is a
readable ZIP whose `project.json` round-trips. For a full runtime check, drag a
generated `.sb3` into TurboWarp or the Scratch editor.

## IR cheat-sheet

```jsonc
{
  "variables": { "score": 0 },        // optional globals
  "sprites": [{
    "name": "Cat",
    "scripts": [[                       // a script = array of blocks
      { "op": "event_whenflagclicked" },
      { "op": "control_repeat", "inputs": { "TIMES": 4 }, "body": [
        { "op": "motion_movesteps", "inputs": { "STEPS": 10 } }
      ] }
    ]]
  }]
}
```

Input values can be a literal (`10`, `"hi"`), a nested block
(`{ "op": "operator_add", "inputs": { "NUM1": 1, "NUM2": 2 } }`), a variable
(`{ "var": "score" }`), or a list (`{ "list": "queue" }`).
```
