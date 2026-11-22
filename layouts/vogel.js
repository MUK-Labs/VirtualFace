const reference = "https://www.soyka-musik.at/media/content/downloads/u.-d._soyka_arbeitsbericht_sinfonie_in_yes-dur_die_unspielbare.pdf#page=5";
const description = "https://eufonia.de/the-enharmonic-pipe-organ/";

// Positions transcribed from the labeled drawing. Clip edges to the documented
// excerpt and leave the unlabeled fragments at its edges out of the interface.
// Bounds are measured from the drawing, then tightened slightly to expose each key.
const rectangles = [
  // Spelling, syntonic commas, left, top, right, bottom, optional unclipped width
  ["ais", -1, 176, 170, 231, 270, 95],
  ["c", 2, 231, 170, 291, 246],
  ["cis", 0, 291, 170, 409, 304],
  ["cisis", -2, 409, 170, 469, 254],
  ["fis", 0, 602, 170, 714, 448],
  ["a", 1, 777, 170, 869, 317],
  ["ais", -1, 870, 170, 965, 296],
  ["c", 2, 966, 170, 1024, 244],
  ["cis", 0, 1024, 170, 1067, 305],
  ["f", 2, 543, 207, 601, 390],
  ["fisis", -2, 714, 218, 777, 403],
  ["dis", -1, 446, 290, 542, 415],
  ["h", 0, 174, 324, 288, 598],
  ["d", 1, 349, 315, 446, 465],
  ["h", 0, 908, 311, 1021, 598],
  ["his", -2, 289, 363, 349, 548],
  ["b", 2, 847, 355, 906, 540],
  ["e", 0, 485, 457, 597, 748],
  ["gis", -1, 750, 439, 845, 586],
  ["es", 2, 425, 499, 484, 689],
  ["eis", -2, 599, 514, 658, 697],
  ["cis", -1, 326, 583, 421, 733],
  ["a", 0, 790, 605, 901, 896],
  ["c", 1, 966, 631, 1057, 756],
  ["c", 1, 233, 632, 327, 763],
  ["as", 2, 731, 646, 788, 836],
  ["ais", -2, 902, 659, 963, 846],
  ["ais", -2, 173, 660, 233, 847],
  ["fis", -1, 639, 734, 729, 886],
  ["d", 0, 368, 751, 481, 1043],
  ["f", 1, 542, 755, 636, 910],
  ["des", 2, 304, 800, 365, 983],
  ["dis", -2, 481, 811, 542, 995],
  ["h", -1, 211, 881, 302, 1035],
  ["h", -1, 939, 881, 1032, 1036],
  ["b", 1, 170, 909, 210, 1055, 95],
  ["b", 1, 844, 904, 939, 1059],
  ["g", 0, 672, 911, 784, 1193],
  ["ges", 2, 613, 945, 670, 1134],
  ["gis", -2, 784, 955, 844, 1143],
  ["e", -1, 518, 1030, 612, 1182],
  ["es", 1, 425, 1055, 518, 1205],
  ["c", 0, 246, 1046, 360, 1339],
  ["c", 0, 976, 1068, 1056, 1341],
  ["ces", 2, 186, 1096, 246, 1282],
  ["ces", 2, 916, 1095, 975, 1281],
  ["cis", -2, 360, 1106, 422, 1290],
  ["a", -1, 823, 1179, 915, 1328],
  ["as", 1, 729, 1203, 820, 1354],
  ["f", 0, 554, 1201, 667, 1489],
  ["fes", 2, 494, 1244, 552, 1431],
  ["fis", -2, 670, 1255, 727, 1441],
  ["d", -1, 397, 1328, 491, 1479],
  ["b", 0, 857, 1344, 971, 1543],
  ["b", 0, 168, 1344, 241, 1543],
  ["des", 1, 304, 1362, 397, 1501],
  ["bes", 2, 799, 1394, 855, 1543],
  ["h", -2, 974, 1404, 1032, 1543],
  ["h", -2, 244, 1404, 302, 1543],
  ["g", -1, 705, 1480, 797, 1543],
  ["es", 0, 436, 1493, 551, 1543],
];

const circles = [
  // Spelling, syntonic commas, septimal comma direction, center x, center y
  ["disis", -2, 1, 503, 201],
  ["g", 1, -1, 746, 193],
  ["es", 2, -1, 503, 261],
  ["his", -1, 1, 262, 276],
  ["his", -1, 1, 993, 276],
  ["cis", -1, -1, 444, 284],
  ["a", 0, -1, 201, 298],
  ["a", 0, -1, 931, 297],
  ["dis", 0, 1, 383, 309],
  ["h", 1, 1, 872, 326],
  ["c", 1, -1, 321, 333],
  ["c", 1, -1, 1048, 336],
  ["gisis", -2, 1, 808, 349],
  ["as", 2, -1, 806, 409],
  ["eis", -1, 1, 570, 420],
  ["fis", -1, -1, 746, 432],
  ["d", 0, -1, 505, 446],
  ["gis", 0, 1, 685, 456],
  ["e", -1, 1, 444, 471],
  ["f", 1, -1, 628, 482],
  ["cisis", -2, 1, 383, 495],
  ["des", 2, -1, 383, 554],
  ["ais", -1, 1, 873, 569],
  ["h", -1, -1, 321, 577],
  ["g", 0, -1, 811, 592],
  ["cis", 0, 1, 259, 602],
  ["cis", 0, 1, 993, 605],
  ["a", 1, 1, 751, 620],
  ["b", 1, -1, 203, 628],
  ["b", 1, -1, 932, 629],
  ["fisis", -2, 1, 693, 645],
  ["ges", 2, -1, 692, 704],
  ["dis", -1, 1, 454, 720],
  ["e", -1, -1, 630, 728],
  ["c", 0, -1, 387, 743],
  ["fis", 0, 1, 571, 751],
  ["d", 1, 1, 326, 766],
  ["es", 1, -1, 513, 779],
  ["his", -2, 1, 268, 791],
  ["his", -2, 1, 995, 791],
  ["ces", 2, -1, 267, 850],
  ["ces", 2, -1, 995, 851],
  ["gis", -1, 1, 758, 865],
  ["a", -1, -1, 206, 874],
  ["a", -1, -1, 934, 876],
  ["f", 0, -1, 696, 888],
  ["b", 0, 1, 874, 902],
  ["g", 1, 1, 635, 916],
  ["as", 1, -1, 817, 925],
  ["eis", -2, 1, 576, 942],
  ["fes", 2, -1, 575, 998],
  ["cis", -1, 1, 332, 1013],
  ["d", -1, -1, 512, 1026],
  ["b", 0, -1, 269, 1041],
  ["b", 0, -1, 999, 1041],
  ["e", 0, 1, 451, 1048],
  ["c", 1, 1, 207, 1066],
  ["c", 1, 1, 939, 1065],
  ["des", 1, -1, 392, 1074],
  ["ais", -2, 1, 878, 1090],
  ["bes", 2, -1, 876, 1149],
  ["fis", -1, 1, 640, 1163],
  ["g", -1, -1, 816, 1172],
  ["es", 0, -1, 577, 1187],
  ["a", 0, 1, 756, 1199],
  ["f", 1, 1, 517, 1212],
  ["ges", 1, -1, 697, 1224],
  ["dis", -2, 1, 455, 1236],
  ["eses", 2, -1, 455, 1295],
  ["h", -1, 1, 215, 1311],
  ["h", -1, 1, 945, 1315],
  ["c", -1, -1, 392, 1320],
  ["as", 0, -1, 880, 1335],
  ["d", 0, 1, 333, 1345],
  ["b", 1, 1, 821, 1361],
  ["ces", 1, -1, 273, 1369],
  ["ces", 1, -1, 1001, 1373],
  ["gis", -2, 1, 761, 1386],
  ["asas", 2, -1, 761, 1446],
  ["e", -1, 1, 519, 1459],
  ["f", -1, -1, 699, 1470],
  ["des", 0, -1, 457, 1486],
  ["g", 0, 1, 639, 1498],
  ["es", 1, 1, 395, 1510],
];

const originX = 163;
const originY = 163;
const drawingWidth = 916;
const drawingHeight = 1390;
const circleDiameter = 52;
const keyGap = 5;
const baseMidiNote = 24;
const sup = { "-": "⁻", "+": "⁺", "1": "¹", "2": "²" };
const unalteredFifths = { f: -1, c: 0, g: 1, d: 2, a: 3, e: 4, h: 5, b: -2 };

function pitchLabel(spelling, syntonic, septimal) {
  const comma = syntonic === 0 ? "" : (syntonic > 0 ? `+${syntonic}` : String(syntonic))
    .split("").map((character) => sup[character]).join("");
  const septimalSign = septimal === 0 ? "" : septimal > 0 ? "+" : "−";
  return spelling + septimalSign + comma;
}

// Nominal JI values for the diagram, with C = 1. Octaves are inferred from
// repeated spellings and the left-to-right progression in the drawing.
function pitchRatio(spelling, syntonic, septimal, centerX) {
  const accidentals = spelling.slice(1).match(/is|es|as|s/g) ?? [];
  const alteration = accidentals.reduce((sum, accidental) => sum + (accidental === "is" ? 1 : -1), 0);
  const fifths = unalteredFifths[spelling[0]] + 7 * alteration;
  const logRatio = fifths * Math.log2(3 / 2)
    + syntonic * Math.log2(81 / 80) + septimal * Math.log2(64 / 63);
  const horizontalOctave = (centerX - 303) / 720;
  return 2 ** (logRatio + Math.round(horizontalOctave - logRatio));
}

function rectangleKind(width, syntonic) {
  if (width > 100 || syntonic === 0) return "base";
  if (width >= 76) return syntonic > 0 ? "minor-third" : "major-third";
  return syntonic > 0 ? "chromatic-down" : "chromatic-up";
}

const rectangleKeys = rectangles.map(([spelling, syntonic, left, top, right, bottom, fullWidth]) => {
  const innerLeft = left + keyGap / 2;
  const innerRight = right - keyGap / 2;
  let innerTop = top + keyGap / 2;
  let innerBottom = bottom - keyGap / 2;
  const circleClearance = circleDiameter / 2 + 2;

  // Vogel's drawing lets buttons cut into key corners. Leave space around
  // those buttons when rendering the long keys as straight rectangles.
  for (const [, , , centerX, centerY] of circles) {
    const distance = Math.max(innerLeft - centerX, centerX - innerRight, 0);
    if (distance >= circleClearance) continue;

    const reach = Math.sqrt(circleClearance ** 2 - distance ** 2);
    if (centerY + reach <= innerTop || centerY - reach >= innerBottom) continue;

    if (centerY < (top + bottom) / 2) innerTop = centerY + reach;
    else innerBottom = centerY - reach;
  }

  return {
    shape: "rect",
    x: innerLeft - originX,
    y: innerTop - originY,
    width: innerRight - innerLeft,
    height: innerBottom - innerTop,
    label: pitchLabel(spelling, syntonic, 0),
    kind: rectangleKind(fullWidth ?? right - left, syntonic),
    ratio: pitchRatio(spelling, syntonic, 0, (left + right) / 2),
  };
});

const circleKeys = circles.map(([spelling, syntonic, septimal, centerX, centerY]) => ({
  shape: "circle",
  x: centerX - originX - circleDiameter / 2,
  y: centerY - originY - circleDiameter / 2,
  width: circleDiameter,
  height: circleDiameter,
  label: pitchLabel(spelling, syntonic, septimal),
  kind: "septimal",
  ratio: pitchRatio(spelling, syntonic, septimal, centerX),
}));

// Reserve one MIDI address per drawn key in nominal pitch order. Each MIDI
// channel carries notes 24–127 before the next channel begins at note 24.
const notesPerChannel = 128 - baseMidiNote;
const indexByPitch = new Map(
  [...rectangleKeys, ...circleKeys].sort((left, right) => left.ratio - right.ratio)
    .map((key, index) => [key, index]),
);
const keys = [...rectangleKeys, ...circleKeys].map((key) => {
  const index = indexByPitch.get(key);
  return {
    ...key,
    id: `vogel-${index + 1}`,
    midiNote: baseMidiNote + index % notesPerChannel,
    channelOffset: Math.floor(index / notesPerChannel),
  };
});

export const vogelLayout = {
  id: "vogel",
  name: "Vogel · Enharmonic organ",
  description: "Martin Vogel’s special manual, transcribed from the published keyboard drawing.",
  sourceUrl: reference,
  instrumentUrl: description,
  width: drawingWidth,
  height: drawingHeight,
  keys,
};
