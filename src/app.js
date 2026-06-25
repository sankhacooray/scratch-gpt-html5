// Browser glue for the Scratch GPT web UI.
import { buildSb3 } from './sb3.js';
import { describeToIR } from './llm.js';

const $ = (id) => document.getElementById(id);
const SETTINGS_KEY = 'scratch-gpt:settings';

const EXAMPLES = {
  dance: {
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
  },
  quiz: {
    variables: { score: 0 },
    sprites: [{
      name: 'Cat',
      scripts: [[
        { op: 'event_whenflagclicked' },
        { op: 'data_setvariableto', fields: { VARIABLE: 'score' }, inputs: { VALUE: 0 } },
        { op: 'sensing_askandwait', inputs: { QUESTION: 'What is 2 + 2?' } },
        { op: 'control_if_else',
          inputs: { CONDITION: { op: 'operator_equals', inputs: { OPERAND1: { op: 'sensing_answer' }, OPERAND2: 4 } } },
          body: [
            { op: 'data_changevariableby', fields: { VARIABLE: 'score' }, inputs: { VALUE: 1 } },
            { op: 'looks_sayforsecs', inputs: { MESSAGE: 'Correct!', SECS: 2 } },
          ],
          body2: [{ op: 'looks_sayforsecs', inputs: { MESSAGE: 'Try again!', SECS: 2 } }],
        },
      ]],
    }],
  },
};

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
}
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function setReport(html) { $('report').innerHTML = html; }

function reportLine(kind, icon, text) {
  return `<div class="${kind}"><i class="fa-solid ${icon}"></i>${escapeHtml(text)}</div>`;
}

function renderReport(report) {
  const parts = [];
  parts.push(report.ok
    ? reportLine('ok', 'fa-circle-check', 'Valid')
    : reportLine('bad', 'fa-circle-xmark', 'Invalid'));
  for (const e of report.errors) parts.push(reportLine('bad', 'fa-triangle-exclamation', 'error: ' + e));
  for (const w of report.warnings) parts.push(reportLine('warn', 'fa-circle-exclamation', 'warning: ' + w));
  setReport(parts.join(''));
}

// Parse + compile the current IR, render the report, and return the build result (or null).
function validate() {
  let ir;
  try { ir = JSON.parse($('ir').value); }
  catch (e) { setReport(reportLine('bad', 'fa-circle-xmark', 'Invalid JSON: ' + e.message)); return null; }
  let result;
  try { result = buildSb3(ir); }
  catch (e) { setReport(reportLine('bad', 'fa-circle-xmark', 'Compile error: ' + e.message)); return null; }
  renderReport(result.report);
  return result;
}

function download() {
  const result = validate();
  if (!result || !result.report.ok) return;
  const ir = JSON.parse($('ir').value);
  const blob = new Blob([result.bytes], { type: 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (ir.name || 'scratch-gpt-project') + '.sb3';
  a.click();
  URL.revokeObjectURL(a.href);
}

// --- IR editor (line-number gutter + auto-validate) ---
let validateTimer;

function renderGutter() {
  const ta = $('ir');
  const lines = ta.value.split('\n').length;
  const g = $('gutter');
  const have = g.childElementCount;
  if (have !== lines) {
    let html = '';
    for (let i = 1; i <= lines; i++) html += '<div>' + i + '</div>';
    g.innerHTML = html;
  }
  g.scrollTop = ta.scrollTop;
}

// Set editor content programmatically and refresh gutter + validation.
function setIR(text) {
  $('ir').value = text;
  renderGutter();
  validate();
}

function onEditorInput() {
  renderGutter();
  clearTimeout(validateTimer);
  validateTimer = setTimeout(validate, 350); // debounce to avoid validating on every keystroke
}

async function generate() {
  const desc = $('desc').value.trim();
  if (!desc) { setReport(reportLine('bad', 'fa-circle-xmark', 'Type a description first.')); return; }
  const btn = $('btnGenerate');
  const prev = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating…';
  setReport(reportLine('warn', 'fa-spinner', 'Generating IR from your description…'));
  try {
    const ir = await describeToIR(desc, loadSettings());
    setIR(JSON.stringify(ir, null, 2));
    if (demoRemaining !== null && demoRemaining > 0) { demoRemaining -= 1; renderDemoBadge(); }
  } catch (e) {
    setReport(reportLine('bad', 'fa-circle-xmark', e.message));
  } finally {
    btn.disabled = false;
    btn.innerHTML = prev;
  }
}

// --- Settings modal ---
function openSettings() {
  const s = loadSettings();
  $('provider').value = s.provider || '';
  $('model').value = s.model || '';
  $('settingsModal').hidden = false;
}
function closeSettings() { $('settingsModal').hidden = true; }

function initSettingsUI() {
  $('btnSettings').addEventListener('click', openSettings);
  $('saveSettings').addEventListener('click', () => {
    saveSettings({ provider: $('provider').value, model: $('model').value.trim() });
    closeSettings();
  });
  $('settingsModal').querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeSettings));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSettings(); });
}

// --- Signed-in user chip + demo badge ---
// When served by the Apps Script web app, the page injects window.SCRATCH_INFO
// ({ email, name, isAdmin, limit, used, remaining }). On localhost there's no
// value, so the chip stays hidden and no demo badge shows.
function scratchInfo() {
  return (typeof window !== 'undefined' && window.SCRATCH_INFO) || null;
}

function initUserChip() {
  const info = scratchInfo();
  const email = info ? info.email : (typeof window !== 'undefined' ? window.SCRATCH_USER : '');
  const chip = $('userChip');
  if (!chip) return;
  if (email) {
    $('userEmail').textContent = (info && info.name) ? `${info.name} · ${email}` : email;
    chip.hidden = false;
  } else {
    chip.hidden = true;
  }
}

// Demo badge: shows "demo · N left today" for non-admin accounts. Hidden for
// admins (unlimited) and on localhost (no SCRATCH_INFO).
let demoRemaining = null; // null = unlimited / unknown

function renderDemoBadge() {
  const badge = $('demoBadge');
  if (!badge) return;
  if (demoRemaining === null) { badge.hidden = true; return; }
  badge.hidden = false;
  badge.textContent = demoRemaining > 0 ? `demo · ${demoRemaining} left today` : 'demo · limit reached';
}

function initDemoBadge() {
  const info = scratchInfo();
  // Only gate when the server told us this is a limited (non-admin) account.
  if (info && info.isAdmin === false && typeof info.remaining === 'number') {
    demoRemaining = info.remaining;
  } else {
    demoRemaining = null;
  }
  renderDemoBadge();
}

window.addEventListener('DOMContentLoaded', () => {
  $('btnGenerate').addEventListener('click', generate);
  $('btnBuild').addEventListener('click', download);
  $('ir').addEventListener('input', onEditorInput);
  $('ir').addEventListener('scroll', () => { $('gutter').scrollTop = $('ir').scrollTop; });
  $('exDance').addEventListener('click', () => setIR(JSON.stringify(EXAMPLES.dance, null, 2)));
  $('exQuiz').addEventListener('click', () => setIR(JSON.stringify(EXAMPLES.quiz, null, 2)));
  initSettingsUI();
  initUserChip();
  initDemoBadge();
  setIR(JSON.stringify(EXAMPLES.dance, null, 2));

  // Tell the GitHub Pages wrapper we rendered successfully, so it can drop its
  // loading/sign-in overlay. This is a *positive* signal from our own code —
  // Google's (un-iframable) auth pages never send it, so a not-yet-authorized
  // visitor keeps the "Open Scratch GPT" launch button instead of a blank frame.
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: 'scratch-gpt', type: 'ready' }, '*');
    }
  } catch (e) { /* not framed / blocked — ignore */ }
});
