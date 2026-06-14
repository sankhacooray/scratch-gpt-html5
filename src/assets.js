// Bundled default assets. Generating original art is out of scope for v1, so
// every sprite ships with this one simple costume and the stage with a blank
// backdrop. Scratch keys assets by the MD5 of their bytes, computed at build
// time (see sb3.js), so editing these strings just changes the asset filename.

export const COSTUME_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
  '<circle cx="50" cy="50" r="45" fill="#FFD43B" stroke="#E6A700" stroke-width="3"/>' +
  '<circle cx="35" cy="42" r="6" fill="#333333"/>' +
  '<circle cx="65" cy="42" r="6" fill="#333333"/>' +
  '<path d="M35 65 Q50 78 65 65" stroke="#333333" stroke-width="4" fill="none" stroke-linecap="round"/>' +
  '</svg>';

export const BACKDROP_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">' +
  '<rect width="480" height="360" fill="#ffffff"/>' +
  '</svg>';
