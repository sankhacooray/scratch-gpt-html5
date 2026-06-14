// Catalog of supported Scratch 3 blocks.
//
// Each entry describes one opcode so the compiler can emit a correct block in
// the sb3 `project.json` format. This is the curated "syntax" Scratch GPT knows.
//
//   type:      'hat' | 'stack' | 'cap' | 'reporter' | 'boolean' | 'c'
//   inputs:    name -> spec. spec.kind is one of:
//                number | positive | whole | integer | angle | colour | text
//                  -> a value slot backed by a shadow primitive
//                bool       -> a hexagonal slot (only accepts a boolean block)
//                menu       -> a dropdown backed by a shadow menu block
//                              (spec.op, spec.field, spec.default)
//                broadcast  -> a broadcast value slot
//   fields:    name -> spec. spec.kind is one of:
//                simple    -> plain dropdown/field, value + null id
//                variable  -> references a variable (value + variable id)
//                broadcast -> references a broadcast (value + broadcast id)
//   substacks: ordered list of C-mouth input names ('SUBSTACK', 'SUBSTACK2')
//
// To teach Scratch GPT a new block, add an entry here — nothing else changes.

export const SHADOW_PRIM = {
  number: 4,
  positive: 5,
  whole: 6,
  integer: 7,
  angle: 8,
  colour: 9,
  text: 10,
};

const n = (def) => ({ kind: 'number', default: def });
const num = n;

export const CATALOG = {
  // ---- EVENTS ----
  event_whenflagclicked: { type: 'hat', category: 'events' },
  event_whenkeypressed: { type: 'hat', category: 'events', fields: { KEY_OPTION: { kind: 'simple', default: 'space' } } },
  event_whenthisspriteclicked: { type: 'hat', category: 'events' },
  event_whenbackdropswitchesto: { type: 'hat', category: 'events', fields: { BACKDROP: { kind: 'simple', default: 'backdrop1' } } },
  event_whenbroadcastreceived: { type: 'hat', category: 'events', fields: { BROADCAST_OPTION: { kind: 'broadcast' } } },
  event_broadcast: { type: 'stack', category: 'events', inputs: { BROADCAST_INPUT: { kind: 'broadcast' } } },
  event_broadcastandwait: { type: 'stack', category: 'events', inputs: { BROADCAST_INPUT: { kind: 'broadcast' } } },

  // ---- MOTION ----
  motion_movesteps: { type: 'stack', category: 'motion', inputs: { STEPS: num(10) } },
  motion_turnright: { type: 'stack', category: 'motion', inputs: { DEGREES: num(15) } },
  motion_turnleft: { type: 'stack', category: 'motion', inputs: { DEGREES: num(15) } },
  motion_gotoxy: { type: 'stack', category: 'motion', inputs: { X: num(0), Y: num(0) } },
  motion_goto: { type: 'stack', category: 'motion', inputs: { TO: { kind: 'menu', op: 'motion_goto_menu', field: 'TO', default: '_random_' } } },
  motion_glidesecstoxy: { type: 'stack', category: 'motion', inputs: { SECS: num(1), X: num(0), Y: num(0) } },
  motion_glideto: { type: 'stack', category: 'motion', inputs: { SECS: num(1), TO: { kind: 'menu', op: 'motion_glideto_menu', field: 'TO', default: '_random_' } } },
  motion_pointindirection: { type: 'stack', category: 'motion', inputs: { DIRECTION: { kind: 'angle', default: 90 } } },
  motion_pointtowards: { type: 'stack', category: 'motion', inputs: { TOWARDS: { kind: 'menu', op: 'motion_pointtowards_menu', field: 'TOWARDS', default: '_mouse_' } } },
  motion_changexby: { type: 'stack', category: 'motion', inputs: { DX: num(10) } },
  motion_setx: { type: 'stack', category: 'motion', inputs: { X: num(0) } },
  motion_changeyby: { type: 'stack', category: 'motion', inputs: { DY: num(10) } },
  motion_sety: { type: 'stack', category: 'motion', inputs: { Y: num(0) } },
  motion_ifonedgebounce: { type: 'stack', category: 'motion' },
  motion_setrotationstyle: { type: 'stack', category: 'motion', fields: { STYLE: { kind: 'simple', default: 'all around' } } },
  motion_xposition: { type: 'reporter', category: 'motion' },
  motion_yposition: { type: 'reporter', category: 'motion' },
  motion_direction: { type: 'reporter', category: 'motion' },

  // ---- LOOKS ----
  looks_sayforsecs: { type: 'stack', category: 'looks', inputs: { MESSAGE: { kind: 'text', default: 'Hello!' }, SECS: num(2) } },
  looks_say: { type: 'stack', category: 'looks', inputs: { MESSAGE: { kind: 'text', default: 'Hello!' } } },
  looks_thinkforsecs: { type: 'stack', category: 'looks', inputs: { MESSAGE: { kind: 'text', default: 'Hmm...' }, SECS: num(2) } },
  looks_think: { type: 'stack', category: 'looks', inputs: { MESSAGE: { kind: 'text', default: 'Hmm...' } } },
  looks_switchcostumeto: { type: 'stack', category: 'looks', inputs: { COSTUME: { kind: 'menu', op: 'looks_costume', field: 'COSTUME', default: 'costume1' } } },
  looks_nextcostume: { type: 'stack', category: 'looks' },
  looks_switchbackdropto: { type: 'stack', category: 'looks', inputs: { BACKDROP: { kind: 'menu', op: 'looks_backdrops', field: 'BACKDROP', default: 'backdrop1' } } },
  looks_nextbackdrop: { type: 'stack', category: 'looks' },
  looks_changesizeby: { type: 'stack', category: 'looks', inputs: { CHANGE: num(10) } },
  looks_setsizeto: { type: 'stack', category: 'looks', inputs: { SIZE: num(100) } },
  looks_changeeffectby: { type: 'stack', category: 'looks', fields: { EFFECT: { kind: 'simple', default: 'COLOR' } }, inputs: { CHANGE: num(25) } },
  looks_seteffectto: { type: 'stack', category: 'looks', fields: { EFFECT: { kind: 'simple', default: 'COLOR' } }, inputs: { VALUE: num(0) } },
  looks_cleargraphiceffects: { type: 'stack', category: 'looks' },
  looks_show: { type: 'stack', category: 'looks' },
  looks_hide: { type: 'stack', category: 'looks' },
  looks_gotofrontback: { type: 'stack', category: 'looks', fields: { FRONT_BACK: { kind: 'simple', default: 'front' } } },
  looks_goforwardbackwardlayers: { type: 'stack', category: 'looks', fields: { FORWARD_BACKWARD: { kind: 'simple', default: 'forward' } }, inputs: { NUM: { kind: 'integer', default: 1 } } },
  looks_costumenumbername: { type: 'reporter', category: 'looks', fields: { NUMBER_NAME: { kind: 'simple', default: 'number' } } },
  looks_backdropnumbername: { type: 'reporter', category: 'looks', fields: { NUMBER_NAME: { kind: 'simple', default: 'number' } } },
  looks_size: { type: 'reporter', category: 'looks' },

  // ---- SOUND ---- (no sounds are bundled, so these reference names that won't play)
  sound_playuntildone: { type: 'stack', category: 'sound', inputs: { SOUND_MENU: { kind: 'menu', op: 'sound_sounds_menu', field: 'SOUND_MENU', default: 'pop' } } },
  sound_play: { type: 'stack', category: 'sound', inputs: { SOUND_MENU: { kind: 'menu', op: 'sound_sounds_menu', field: 'SOUND_MENU', default: 'pop' } } },
  sound_stopallsounds: { type: 'stack', category: 'sound' },
  sound_changeeffectby: { type: 'stack', category: 'sound', fields: { EFFECT: { kind: 'simple', default: 'PITCH' } }, inputs: { VALUE: num(10) } },
  sound_seteffectto: { type: 'stack', category: 'sound', fields: { EFFECT: { kind: 'simple', default: 'PITCH' } }, inputs: { VALUE: num(100) } },
  sound_cleareffects: { type: 'stack', category: 'sound' },
  sound_changevolumeby: { type: 'stack', category: 'sound', inputs: { VOLUME: num(-10) } },
  sound_setvolumeto: { type: 'stack', category: 'sound', inputs: { VOLUME: num(100) } },
  sound_volume: { type: 'reporter', category: 'sound' },

  // ---- CONTROL ----
  control_wait: { type: 'stack', category: 'control', inputs: { DURATION: { kind: 'positive', default: 1 } } },
  control_repeat: { type: 'c', category: 'control', inputs: { TIMES: { kind: 'whole', default: 10 } }, substacks: ['SUBSTACK'] },
  control_forever: { type: 'c', category: 'control', substacks: ['SUBSTACK'], cap: true },
  control_if: { type: 'c', category: 'control', inputs: { CONDITION: { kind: 'bool' } }, substacks: ['SUBSTACK'] },
  control_if_else: { type: 'c', category: 'control', inputs: { CONDITION: { kind: 'bool' } }, substacks: ['SUBSTACK', 'SUBSTACK2'] },
  control_wait_until: { type: 'stack', category: 'control', inputs: { CONDITION: { kind: 'bool' } } },
  control_repeat_until: { type: 'c', category: 'control', inputs: { CONDITION: { kind: 'bool' } }, substacks: ['SUBSTACK'] },
  control_stop: { type: 'cap', category: 'control', fields: { STOP_OPTION: { kind: 'simple', default: 'all' } } },
  control_start_as_clone: { type: 'hat', category: 'control' },
  control_create_clone_of: { type: 'stack', category: 'control', inputs: { CLONE_OPTION: { kind: 'menu', op: 'control_create_clone_of_menu', field: 'CLONE_OPTION', default: '_myself_' } } },
  control_delete_this_clone: { type: 'cap', category: 'control' },

  // ---- SENSING ----
  sensing_touchingobject: { type: 'boolean', category: 'sensing', inputs: { TOUCHINGOBJECTMENU: { kind: 'menu', op: 'sensing_touchingobjectmenu', field: 'TOUCHINGOBJECTMENU', default: '_edge_' } } },
  sensing_touchingcolor: { type: 'boolean', category: 'sensing', inputs: { COLOR: { kind: 'colour', default: '#ff0000' } } },
  sensing_askandwait: { type: 'stack', category: 'sensing', inputs: { QUESTION: { kind: 'text', default: 'What is your name?' } } },
  sensing_answer: { type: 'reporter', category: 'sensing' },
  sensing_keypressed: { type: 'boolean', category: 'sensing', inputs: { KEY_OPTION: { kind: 'menu', op: 'sensing_keyoptions', field: 'KEY_OPTION', default: 'space' } } },
  sensing_mousedown: { type: 'boolean', category: 'sensing' },
  sensing_mousex: { type: 'reporter', category: 'sensing' },
  sensing_mousey: { type: 'reporter', category: 'sensing' },
  sensing_timer: { type: 'reporter', category: 'sensing' },
  sensing_resettimer: { type: 'stack', category: 'sensing' },
  sensing_distanceto: { type: 'reporter', category: 'sensing', inputs: { DISTANCETOMENU: { kind: 'menu', op: 'sensing_distancetomenu', field: 'DISTANCETOMENU', default: '_mouse_' } } },

  // ---- OPERATORS ----
  operator_add: { type: 'reporter', category: 'operators', inputs: { NUM1: { kind: 'number', default: '' }, NUM2: { kind: 'number', default: '' } } },
  operator_subtract: { type: 'reporter', category: 'operators', inputs: { NUM1: { kind: 'number', default: '' }, NUM2: { kind: 'number', default: '' } } },
  operator_multiply: { type: 'reporter', category: 'operators', inputs: { NUM1: { kind: 'number', default: '' }, NUM2: { kind: 'number', default: '' } } },
  operator_divide: { type: 'reporter', category: 'operators', inputs: { NUM1: { kind: 'number', default: '' }, NUM2: { kind: 'number', default: '' } } },
  operator_random: { type: 'reporter', category: 'operators', inputs: { FROM: num(1), TO: num(10) } },
  operator_gt: { type: 'boolean', category: 'operators', inputs: { OPERAND1: { kind: 'text', default: '' }, OPERAND2: { kind: 'text', default: '50' } } },
  operator_lt: { type: 'boolean', category: 'operators', inputs: { OPERAND1: { kind: 'text', default: '' }, OPERAND2: { kind: 'text', default: '50' } } },
  operator_equals: { type: 'boolean', category: 'operators', inputs: { OPERAND1: { kind: 'text', default: '' }, OPERAND2: { kind: 'text', default: '50' } } },
  operator_and: { type: 'boolean', category: 'operators', inputs: { OPERAND1: { kind: 'bool' }, OPERAND2: { kind: 'bool' } } },
  operator_or: { type: 'boolean', category: 'operators', inputs: { OPERAND1: { kind: 'bool' }, OPERAND2: { kind: 'bool' } } },
  operator_not: { type: 'boolean', category: 'operators', inputs: { OPERAND: { kind: 'bool' } } },
  operator_join: { type: 'reporter', category: 'operators', inputs: { STRING1: { kind: 'text', default: 'apple ' }, STRING2: { kind: 'text', default: 'banana' } } },
  operator_letter_of: { type: 'reporter', category: 'operators', inputs: { LETTER: { kind: 'whole', default: 1 }, STRING: { kind: 'text', default: 'apple' } } },
  operator_length: { type: 'reporter', category: 'operators', inputs: { STRING: { kind: 'text', default: 'apple' } } },
  operator_contains: { type: 'boolean', category: 'operators', inputs: { STRING1: { kind: 'text', default: 'apple' }, STRING2: { kind: 'text', default: 'a' } } },
  operator_mod: { type: 'reporter', category: 'operators', inputs: { NUM1: { kind: 'number', default: '' }, NUM2: { kind: 'number', default: '' } } },
  operator_round: { type: 'reporter', category: 'operators', inputs: { NUM: { kind: 'number', default: '' } } },
  operator_mathop: { type: 'reporter', category: 'operators', fields: { OPERATOR: { kind: 'simple', default: 'abs' } }, inputs: { NUM: { kind: 'number', default: '' } } },

  // ---- VARIABLES ----
  data_setvariableto: { type: 'stack', category: 'variables', fields: { VARIABLE: { kind: 'variable' } }, inputs: { VALUE: { kind: 'text', default: '0' } } },
  data_changevariableby: { type: 'stack', category: 'variables', fields: { VARIABLE: { kind: 'variable' } }, inputs: { VALUE: num(1) } },
  data_showvariable: { type: 'stack', category: 'variables', fields: { VARIABLE: { kind: 'variable' } } },
  data_hidevariable: { type: 'stack', category: 'variables', fields: { VARIABLE: { kind: 'variable' } } },
};

// Opcodes that are valid only as auto-generated shadow menu blocks.
export const MENU_OPCODES = new Set(
  Object.values(CATALOG)
    .flatMap((spec) => Object.values(spec.inputs || {}))
    .filter((i) => i.kind === 'menu')
    .map((i) => i.op),
);
