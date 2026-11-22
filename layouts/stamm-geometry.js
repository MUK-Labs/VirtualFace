// Ivory key centers measured on the rectified full-console photograph.
// Each band starts with the first visible ivory key (repeat zero); the builder's
// close-up resolves key shapes and confirms the stepped ends of the bands.
export const whiteKeyBands = [
  [84, 303, 515, 729, 941],
  [122, 179, 394, 606, 817],
  [161, 269, 484, 698, 911],
  [200, 142, 360, 575, 788],
  [239, 234, 450, 666, 879],
  [279, 323, 541, 756],
  [320, 198, 413, 633, 847],
  [360, 287, 506, 724, 939],
  [401, 160, 377, 595, 813],
  [443, 252, 471, 689, 908],
  [485, 342, 561, 780],
  [526, 215, 436, 654, 874],
  [568, 306, 528, 748, 966],
  [612, 177, 398, 619, 839],
  [654, 269, 492, 714, 934],
];

// Terminal fragments are selective. A repeating motif does not continue into
// the surrounding oak at the top, bottom, or either side of the manual.
const upperEdges = [
  [1, 1, [12, 13, 14]],
  ...[2, 3, 4, 5].map((group) => [1, group, [3, 6, 8, 9, 12, 14]]),
];
const lowerEdges = [2, 3, 4, 5].map((group) => [15, group, [5, 7, 9, 11, 13]]);
const sideEdges = [
  [2, 6, [8, 9]],
  [3, 1, [14]],
  [3, 5, [6, 12]],
  [4, 6, [3, 5, 10]],
  [5, 2, [8, 9]],
  [5, 5, [13, 14]],
  [6, 1, [11, 12]],
  [6, 5, [1, 2]],
  [7, 2, [5, 10]],
  [7, 6, [8]],
  [8, 1, [13, 14]],
  [8, 5, [6, 11]],
  [9, 6, [10]],
  [10, 2, [7]],
  [11, 1, [4]],
  [12, 2, [9]],
  [13, 1, [12]],
  [15, 5, [6, 12, 14]],
];

export const missingControls = new Set(
  [...upperEdges, ...lowerEdges, ...sideEdges].flatMap(([band, group, controls]) =>
    controls.map((control) => `${band}-${group}-${control}`),
  ),
);

// The original equal rectangular crop excluded the front portion of each
// longest walnut key at the back of the manual, even where it is visible.
export const additionalControls = new Set([2, 3, 4, 5].map((group) => `1-${group}-1`));

// The exposed terminal buttons are set a little farther into the board
// than the continuation of the interior repeat would place them.
export const terminalButtonShifts = new Map([
  ["1-7", [8, -3]],
  ["1-10", [-4, 6]],
  ["1-13", [4, 1]],
  ["15-12", [6, 0]],
  ["15-14", [4, -2]],
]);
