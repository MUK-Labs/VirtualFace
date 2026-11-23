const svgNamespace = "http://www.w3.org/2000/svg";
const lightsByButton = new WeakMap();
let nextArtwork = 0;

function svgElement(document, name, attributes = {}) {
  const element = document.createElementNS(svgNamespace, name);
  for (const [attribute, value] of Object.entries(attributes)) element.setAttribute(attribute, value);
  return element;
}

function artworkLayer(document, layout, className) {
  return svgElement(document, "svg", {
    class: className,
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    preserveAspectRatio: "none",
    "aria-hidden": "true",
  });
}

function region(document, key) {
  if (key.points) {
    return svgElement(document, "polygon", { points: key.points.map((point) => point.join(",")).join(" ") });
  }
  const { x, y, width, height } = key;
  if (key.shape === "circle") {
    return svgElement(document, "ellipse", {
      cx: x + width / 2, cy: y + height / 2, rx: width / 2, ry: height / 2,
    });
  }
  return svgElement(document, "rect", { x, y, width, height });
}

export function renderArtwork(keyboard, layout) {
  const visible = Boolean(layout.artworkUrl);
  keyboard.classList.toggle("has-artwork", visible);
  if (!visible) return;

  const document = keyboard.ownerDocument;
  const prefix = `virtualface-artwork-${++nextArtwork}`;
  const lighting = artworkLayer(document, layout, "artwork-lighting");
  const outlines = artworkLayer(document, layout, "artwork-outlines");
  const definitions = svgElement(document, "defs");
  const gradient = svgElement(document, "radialGradient", { id: `${prefix}-bulb` });
  gradient.append(
    svgElement(document, "stop", { offset: "0%", "stop-color": "#fff", "stop-opacity": .64 }),
    svgElement(document, "stop", { offset: "100%", "stop-color": "#fff", "stop-opacity": .42 }),
  );
  const blur = svgElement(document, "filter", {
    id: `${prefix}-spill`, x: "-35%", y: "-35%", width: "170%", height: "170%",
  });
  blur.append(svgElement(document, "feGaussianBlur", {
    stdDeviation: Math.min(layout.width, layout.height) * .0075,
  }));
  definitions.append(gradient, blur);
  lighting.append(definitions);

  const keys = new Map(layout.keys.map((key) => [key.id, key]));
  for (const button of keyboard.querySelectorAll(".key")) {
    const key = keys.get(button.dataset.key);
    if (!key) continue;
    const beam = svgElement(document, "g", { class: "artwork-beam" });
    const spill = region(document, key);
    spill.setAttribute("fill", "#fff");
    spill.setAttribute("opacity", ".23");
    spill.setAttribute("filter", `url(#${prefix}-spill)`);
    const core = region(document, key);
    core.setAttribute("fill", `url(#${prefix}-bulb)`);
    beam.append(spill, core);
    lighting.append(beam);
    lightsByButton.set(button, beam);
    setArtworkActive(button, button.classList.contains("is-active"));

    const outline = region(document, key);
    outline.setAttribute("class", "artwork-focus");
    outline.setAttribute("vector-effect", "non-scaling-stroke");
    outlines.append(outline);
    button.addEventListener("focus", () => outline.classList.toggle("is-visible", button.matches(":focus-visible")));
    button.addEventListener("blur", () => outline.classList.remove("is-visible"));
  }

  const painting = document.createElement("img");
  painting.className = "artwork-painting";
  painting.alt = "";
  painting.draggable = false;
  painting.src = layout.artworkUrl;
  keyboard.prepend(lighting, painting, outlines);
}

export function setArtworkActive(button, active) {
  lightsByButton.get(button)?.classList.toggle("is-lit", active);
}
