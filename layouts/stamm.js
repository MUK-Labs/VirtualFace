import { additionalControls, missingControls, terminalButtonShifts, whiteKeyBands } from "./stamm-geometry.js";

const builderPhoto = "https://www.orgel-schumacher.com/media/1261/enharmonische-o_0001.jpg";
const consolePhoto = "https://eufonia.de/wp-content/uploads/Enh._Orgel_Totale-scaled.jpg";
const instrumentUrl = "https://eufonia.de/the-enharmonic-pipe-organ/";

// Geometry relative to the center of each ivory bar in the rectified photos.
// The two walnut halves have individual addresses and share the same pitch.
const controls = [
  // x, y, width, height, kind, finish, fifths, syntonic, septimal
  [-26, -21.5, 31, 39, "base", "", 0, 0, 0],
  [-26,  19,   31, 39, "base", "", 0, 0, 0],
  [-52,  -2,   15, 46, "chromatic-down", "", -7, 2, 0],
  [  0,   0,   17, 47, "chromatic-up", "",    7, -2, 0],
  [-75,  17,   21, 31, "major-third", "",    3, -1, 0],
  [ 23, -15,   20, 32, "minor-third", "",   -3, 1, 0],
  [-127,  7,   13, 13, "septimal", "mahogany", -6, 1, -1],
  [-109,  0,   13, 13, "septimal", "walnut",    3, 0, 1],
  [ -91, -6,   13, 13, "septimal", "boxwood",   1, -1, -1],
  [ -73,-13,   13, 13, "septimal", "ebony",    -9, 2, -1],
  [  18, 12,   13, 13, "septimal", "ivory",     9, -2, 1],
  [  36,  5,   13, 13, "septimal", "mahogany", -1, 1, 1],
  [  54, -3,   13, 13, "septimal", "walnut",   -3, 0, -1],
  [  73, -9,   13, 13, "septimal", "boxwood",   6, -1, 1],
];

// These masks encode the original key-address order. Each row represents a
// band and each bit an occupied position within a repeat of the controls above.
// Retained positions keep their original MIDI address even if an edge is edited.
const originalMasks = [
  [0x3800, 0x3ffe, 0x3ffe, 0x3ffe, 0x03de, 0x0000],
  [0x0000, 0x3c2f, 0x3fff, 0x3fff, 0x3fff, 0x01c0],
  [0x2000, 0x3fff, 0x3fff, 0x3fff, 0x0fff, 0x0000],
  [0x0000, 0x3c28, 0x3fff, 0x3fff, 0x3fff, 0x03d4],
  [0x0000, 0x3fbf, 0x3fff, 0x3fff, 0x3fff, 0x0000],
  [0x3c20, 0x3fff, 0x3fff, 0x3fff, 0x03d7, 0x0000],
  [0x0000, 0x3e3f, 0x3fff, 0x3fff, 0x3fff, 0x00c0],
  [0x3000, 0x3fff, 0x3fff, 0x3fff, 0x07ff, 0x0000],
  [0x0000, 0x3c2b, 0x3fff, 0x3fff, 0x3fff, 0x03d0],
  [0x0000, 0x3fff, 0x3fff, 0x3fff, 0x1fff, 0x0000],
  [0x3c28, 0x3fff, 0x3fff, 0x3fff, 0x03d4, 0x0000],
  [0x0000, 0x3f3f, 0x3fff, 0x3fff, 0x3fff, 0x0040],
  [0x3800, 0x3fff, 0x3fff, 0x3fff, 0x03df, 0x0000],
  [0x0000, 0x3c2f, 0x3fff, 0x3fff, 0x3fff, 0x01c0],
  [0x2000, 0x3fff, 0x3fff, 0x3fff, 0x0fff, 0x0000],
];
const firstMidiNote = 24;
const notesPerChannel = 128 - firstMidiNote;
const originalFirstIvoryX = [305, 179, 270, 144, 234, 324, 198, 288, 162, 252, 344, 214, 306, 176, 270];
const originalControlX = [-26, -26, -52, 0, -75, 23, -127, -109, -91, -73, 18, 36, 54, 73];
const octaveWidth = 217;
const anchorBand = 7;
const anchorX = originalFirstIvoryX[anchorBand] - 26 + 2 * octaveWidth;

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

function ivoryCenter(positions, repeat) {
  if (repeat < 0) return positions[0] - (positions[1] - positions[0]);
  if (repeat < positions.length) return positions[repeat];
  const last = positions.length - 1;
  return positions[last] + (repeat - last) * (positions[last] - positions[last - 1]);
}

const keys = [];
let originalIndex = 0;
let addedIndex = originalMasks.flat().reduce((sum, mask) => {
  return sum + controls.filter((_, bit) => mask & (1 << bit)).length;
}, 0);
for (const [band, [whiteY, ...positions]] of whiteKeyBands.entries()) {
  for (const [group, originalMask] of originalMasks[band].entries()) {
    const repeat = group - 1;
    const whiteX = ivoryCenter(positions, repeat);
    for (const [control, [dx, dy, w, h, kind, finish, baseFifths, syntonic, septimal]] of controls.entries()) {
      const id = `${band + 1}-${group + 1}-${control + 1}`;
      const existed = Boolean(originalMask & (1 << control));
      const index = existed ? originalIndex++ : null;
      if (missingControls.has(id) || (!existed && !additionalControls.has(id))) continue;

      const rawAddress = index ?? addedIndex++;
      const [shiftX, shiftY] = terminalButtonShifts.get(`${band + 1}-${control + 1}`) ?? [0, 0];
      const atBackWalnut = band === 0 && kind === "base";
      const keyWidth = atBackWalnut ? w - 4 : w;
      const topInset = atBackWalnut && control === 0 ? 10 : 0;
      const fifths = baseFifths + anchorBand - band;
      const sign = septimal === 0 ? "" : septimal > 0 ? "+" : "−";
      const pitchX = originalFirstIvoryX[band] + repeat * octaveWidth + originalControlX[control];
      keys.push({
        id: `stamm-${id}`,
        shape: kind === "septimal" ? "circle" : "rect",
        x: whiteX + dx + shiftX + (atBackWalnut ? 3 : 0) - keyWidth / 2,
        y: whiteY + dy + shiftY - h / 2 + topInset,
        width: keyWidth,
        height: h - topInset,
        kind,
        finish,
        label: noteName(fifths) + sign + commaLabels[syntonic + 2],
        ratio: nominalPitch(fifths, syntonic, septimal, pitchX),
        midiNote: firstMidiNote + rawAddress % notesPerChannel,
        channelOffset: Math.floor(rawAddress / notesPerChannel),
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

const left = Math.min(...keys.map((key) => key.x)) - 4;
const top = Math.min(...keys.map((key) => key.y)) - 4;
const right = Math.max(...keys.map((key) => key.x + key.width)) + 4;
const bottom = Math.max(...keys.map((key) => key.y + key.height)) + 4;
for (const key of keys) {
  key.x -= left;
  key.y -= top;
}

export const stammLayout = {
  id: "stamm",
  name: "Stamm · Built special manual",
  description: "Photo reconstruction of the upper manual on Stamm’s 1979 organ, with nominal just-intonation pitches.",
  sourceUrl: builderPhoto,
  sourceLabel: "Keyboard detail photo",
  consoleUrl: consolePhoto,
  instrumentUrl,
  width: right - left,
  height: bottom - top,
  keys,
};
