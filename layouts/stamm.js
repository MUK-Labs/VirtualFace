const consolePhoto = "https://eufonia.de/wp-content/uploads/Enh._Orgel_Totale-scaled.jpg";
const closeup = "https://eufonia.de/wp-content/uploads/Spezialtastatur.jpg";
const instrumentUrl = "https://eufonia.de/the-enharmonic-pipe-organ/";

// The upper manual of Stamm's 1979 organ. The white key centers in the
// rectified console photo fall into 15 interleaved bands (eight depth rows).
// The same staggered pattern is visible in Soyka's photograph on page 4.
const whiteBands = [
  [305, 84], [179, 121], [270, 160], [144, 200], [234, 239],
  [324, 279], [198, 320], [288, 359], [162, 401], [252, 443],
  [344, 484], [214, 526], [306, 568], [176, 612], [270, 654],
];
const octaveWidth = 217;
const ivoryOffset = 26;
const anchorBand = 7;
const anchorX = whiteBands[anchorBand][0] - ivoryOffset + 2 * octaveWidth;
const photoBounds = { left: 105, right: 975, top: 49, bottom: 698 };
const width = photoBounds.right - photoBounds.left;
const height = photoBounds.bottom - photoBounds.top;

// Coordinates relative to the center of a walnut key on the rectified
// board. Scale and stagger come from Stamm's photos. The two walnut halves
// share a nominal pitch and get independent raw addresses.
const controls = [
  // Shape, center x/y, width/height, wood, fifths, syntonic, septimal
  ["rect",      0, -21, 31, 38, "base",           0,  0,  0],
  ["rect",      0,  19, 31, 38, "base",           0,  0,  0],
  ["rect",    -26,  -2, 15, 46, "chromatic-down", -7,  2,  0],
  ["rect",     26,   1, 17, 47, "chromatic-up",    7, -2,  0],
  ["rect",    -49,  17, 24, 31, "major-third",    3, -1,  0],
  ["rect",     49, -17, 24, 31, "minor-third",   -3,  1,  0],
  ["circle", -101,   8, 12, 12, "septimal",       -6,  1, -1],
  ["circle",  -83,   1, 12, 12, "septimal",        3,  0,  1],
  ["circle",  -65,  -5, 12, 12, "septimal",        1, -1, -1],
  ["circle",  -47, -12, 12, 12, "septimal",       -9,  2, -1],
  ["circle",   44,  12, 12, 12, "septimal",        9, -2,  1],
  ["circle",   62,   6, 12, 12, "septimal",       -1,  1,  1],
  ["circle",   80,  -2, 12, 12, "septimal",       -3,  0, -1],
  ["circle",   99,  -8, 12, 12, "septimal",        6, -1,  1],
];

const fifthsOrder = ["f", "c", "g", "d", "a", "e", "h"];
const commaLabels = ["⁻²", "⁻¹", "", "⁺¹", "⁺²"];

function noteName(fifths) {
  const octave = Math.floor((fifths + 1) / 7);
  const letter = fifthsOrder[fifths + 1 - octave * 7];
  if (octave >= 0) return letter + "is".repeat(octave);
  if (letter === "h") return "b" + "es".repeat(-octave - 1);
  if (letter === "a") return "as".repeat(-octave);
  if (letter === "e") return "e" + "s" + "es".repeat(-octave - 1);
  return letter + "es".repeat(-octave);
}

function nominalPitch(fifths, syntonic, septimal, centerX) {
  const logRatio = fifths * Math.log2(3 / 2) + syntonic * Math.log2(81 / 80)
    + septimal * Math.log2(64 / 63);
  // Vogel's interval relationships give nominal pitches. The octave follows
  // the graphic position relative to the model's reference C. Photos cannot
  // establish the physical manual's per-key pipe mapping or register.
  const graphicOctave = (centerX - anchorX) / octaveWidth;
  return 2 ** (logRatio + Math.round(graphicOctave - logRatio));
}

const keys = [];
const firstMidiNote = 24;
const notesPerChannel = 128 - firstMidiNote;
for (const [band, [firstWhiteX, whiteY]] of whiteBands.entries()) {
  // Model the partial groups at the edges as well as the full repeats.
  for (let repeat = -1; repeat <= 4; repeat++) {
    const walnutX = firstWhiteX - ivoryOffset + repeat * octaveWidth;
    for (const [control, [shape, dx, dy, w, h, kind, baseFifths, syntonic, septimal]] of controls.entries()) {
      const centerX = walnutX + dx;
      const centerY = whiteY - 1 + dy;
      const x = centerX - w / 2 - photoBounds.left;
      const y = centerY - h / 2 - photoBounds.top;
      if (x < 0 || y < 0 || x + w > width || y + h > height) continue;

      const fifths = baseFifths + anchorBand - band;
      const sign = septimal === 0 ? "" : septimal > 0 ? "+" : "−";
      const index = keys.length;
      keys.push({
        id: `stamm-${band + 1}-${repeat + 2}-${control + 1}`,
        shape, x, y, width: w, height: h, kind,
        label: noteName(fifths) + sign + commaLabels[syntonic + 2],
        ratio: nominalPitch(fifths, syntonic, septimal, centerX),
        midiNote: firstMidiNote + index % notesPerChannel,
        channelOffset: Math.floor(index / notesPerChannel),
      });
    }
  }
}

const buttons = keys.filter((key) => key.shape === "circle");
for (const key of keys) {
  if (key.shape !== "rect") continue;
  const middle = key.y + key.height / 2;
  let top = key.y;
  let bottom = key.y + key.height;
  for (const button of buttons) {
    const centerX = button.x + button.width / 2;
    const centerY = button.y + button.height / 2;
    const dx = Math.max(key.x - centerX, centerX - key.x - key.width, 0);
    const clearance = button.width / 2 + 0.35;
    if (dx >= clearance) continue;
    const reach = Math.sqrt(clearance ** 2 - dx ** 2);
    if (centerY + reach <= top || centerY - reach >= bottom) continue;
    if (centerY < middle) top = centerY + reach;
    else bottom = centerY - reach;
  }
  key.y = top;
  key.height = bottom - top;
}

export const stammLayout = {
  id: "stamm",
  name: "Stamm · Built special manual",
  description: "Photo reconstruction of the upper manual on Stamm’s 1979 organ, with nominal just-intonation pitches.",
  sourceUrl: consolePhoto,
  sourceLabel: "Stamm’s console photo",
  closeupUrl: closeup,
  instrumentUrl,
  width,
  height,
  keys,
};
