const maxBytes = 1024 * 1024;
const maxArtworkBytes = 20 * 1024 * 1024;
const maxKeys = 16 * 128;
const maxPolygonPoints = 2048;
const shapes = new Set(["rect", "circle"]);
const kinds = new Set(["base", "chromatic-up", "chromatic-down", "major-third", "minor-third", "septimal"]);
const finishes = new Set(["ivory", "ebony", "mahogany", "walnut", "boxwood"]);

function labelText(value, field, maximum) {
  const label = typeof value === "string" ? value.trim() : "";
  if (!label || label.length > maximum) {
    throw new Error(`${field} must be text between 1 and ${maximum} characters long.`);
  }
  return label;
}

function inRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function fitsAxis(position, size, limit) {
  return inRange(position, 0, limit) && Number.isFinite(size) && size > 0
    && (position + size) / limit <= 1 + 2 * Number.EPSILON;
}

function polygonGeometry(points, width, height, field) {
  if (!Array.isArray(points) || points.length < 3 || points.length > maxPolygonPoints) {
    throw new Error(`${field} needs between 3 and ${maxPolygonPoints} polygon points.`);
  }
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  for (const point of points) {
    if (!Array.isArray(point) || point.length !== 2 || !inRange(point[0], 0, width) || !inRange(point[1], 0, height)) {
      throw new Error(`${field} needs polygon points in [x, y] format within the layout.`);
    }
    const [x, y] = point;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  let twiceArea = 0;
  for (let index = 0; index < points.length; index++) {
    const [x, y] = points[index];
    const [nextX, nextY] = points[(index + 1) % points.length];
    twiceArea += (x - left) * (nextY - top) - (nextX - left) * (y - top);
  }
  if (twiceArea === 0) throw new Error(`${field} needs a polygon that encloses an area.`);
  return { x: left, y: top, width: right - left, height: bottom - top, points };
}

export function parseControllerLayout(text) {
  let definition;
  try {
    definition = JSON.parse(text);
  } catch {
    throw new Error("This file does not contain valid JSON.");
  }
  if (definition?.version !== 1 && definition?.version !== 2) {
    throw new Error("Set the controller file’s version to 1 or 2.");
  }
  const { version, width, height } = definition;
  const name = labelText(definition.name, "The controller name", 100);
  if (!inRange(width, 1, 1e6) || !inRange(height, 1, 1e6)) {
    throw new Error("The layout width and height must be numbers between 1 and 1,000,000.");
  }
  if (!Array.isArray(definition.keys) || definition.keys.length < 1 || definition.keys.length > maxKeys) {
    throw new Error(`Include between 1 and ${maxKeys} keys in the keys array.`);
  }

  const addresses = new Set();
  const keys = definition.keys.map((key, index) => {
    const field = `Key ${index + 1}`;
    if (!key || typeof key !== "object" || Array.isArray(key)) throw new Error(`${field} must be a JSON object.`);
    const label = labelText(key.label, `${field} label`, 40);
    const { x, y, width: keyWidth, height: keyHeight, midiNote, channelOffset = 0 } = key;
    const { shape = "rect", kind = "base" } = key;
    const finish = key.finish === "" ? undefined : key.finish;
    const polygon = version === 2 && shape === "polygon";
    if (!polygon && (!fitsAxis(x, keyWidth, width) || !fitsAxis(y, keyHeight, height))) {
      throw new Error(`${field} must have a positive width and height and fit within the layout.`);
    }
    if (!Number.isInteger(midiNote) || !inRange(midiNote, 0, 127)
      || !Number.isInteger(channelOffset) || !inRange(channelOffset, 0, 15)) {
      throw new Error(`${field} needs a MIDI note from 0 to 127 and a channel offset from 0 to 15.`);
    }
    const ratio = key.ratio === undefined ? 2 ** ((midiNote - 60) / 12) : key.ratio;
    if (!Number.isFinite(ratio) || ratio <= 0) throw new Error(`${field} pitch ratio must be a positive number.`);
    if ((!polygon && !shapes.has(shape)) || !kinds.has(kind) || (finish !== undefined && !finishes.has(finish))) {
      throw new Error(`${field} uses an unknown shape, kind, or finish.`);
    }
    const address = channelOffset * 128 + midiNote;
    if (addresses.has(address)) throw new Error(`${field} repeats a MIDI note and channel offset already in use.`);
    addresses.add(address);
    const geometry = polygon
      ? polygonGeometry(key.points, width, height, field)
      : { x, y, width: keyWidth, height: keyHeight };
    return { id: `imported-${index + 1}`, label, ...geometry, midiNote, channelOffset, ratio, shape, kind, finish };
  });
  if (version === 2 && definition.artwork !== undefined) {
    return { name, width, height, keys, artwork: labelText(definition.artwork, "The artwork reference", 4096) };
  }
  return { name, width, height, keys };
}

function hasSignature(bytes, signature, offset = 0) {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

async function artworkObjectUrl(blob, signal) {
  if (blob.size > maxArtworkBytes) throw new Error("Artwork files can be up to 20 MiB.");
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  let type;
  if (hasSignature(bytes, [137, 80, 78, 71, 13, 10, 26, 10])) type = "image/png";
  else if (hasSignature(bytes, [255, 216, 255])) type = "image/jpeg";
  else if (hasSignature(bytes, [82, 73, 70, 70]) && hasSignature(bytes, [87, 69, 66, 80], 8)) type = "image/webp";
  else throw new Error("Choose PNG, JPEG, or WebP artwork.");

  signal?.throwIfAborted();
  const url = URL.createObjectURL(blob.slice(0, blob.size, type));
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("The artwork could not be decoded. Choose a valid PNG, JPEG, or WebP image.");
  }
  if (signal?.aborted) {
    URL.revokeObjectURL(url);
    signal.throwIfAborted();
  }
  return url;
}

function artworkFilename(reference) {
  try {
    return decodeURIComponent(new URL(reference, "https://virtualface.invalid/").pathname.split("/").at(-1));
  } catch {
    return reference;
  }
}

export async function readControllerFile(file, artworkFile, signal) {
  if (file.size > maxBytes) throw new Error("Controller files can be up to 1 MiB.");
  const layout = parseControllerLayout(await file.text());
  if (!layout.artwork) return layout;
  const filename = artworkFilename(layout.artwork);
  if (!artworkFile || (artworkFile.name !== layout.artwork && artworkFile.name !== filename)) {
    throw new Error(`Select the artwork file “${filename || layout.artwork}” together with the controller JSON.`);
  }
  return { ...layout, artworkUrl: await artworkObjectUrl(artworkFile, signal) };
}

function checkLink(url) {
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Enter a direct HTTPS link without an embedded username or password.");
  }
}

function driveFileId(url) {
  if (url.port) return null;
  let id;
  if (url.hostname === "drive.google.com") {
    id = url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/(?:view|preview))?\/?$/)?.[1];
    if (!id && ["/open", "/uc"].includes(url.pathname)) id = url.searchParams.get("id");
  } else if (url.hostname === "drive.usercontent.google.com" && url.pathname === "/download") {
    id = url.searchParams.get("id");
  }
  return id && /^[\w-]+$/.test(id) ? id : null;
}

async function readLimitedBlob(stream, maxSize, sizeLabel, signal) {
  const reader = stream.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (signal?.aborted) {
        await reader.cancel();
        signal.throwIfAborted();
      }
      if (done) break;
      bytes += chunk.byteLength;
      if (bytes > maxSize) {
        await reader.cancel();
        throw new RangeError(sizeLabel);
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  return new Blob(chunks);
}

async function readLinkedBlob(url, signal, maxSize, fileLabel, sizeLabel) {
  checkLink(url);
  let response;
  try {
    response = await fetch(url, { signal, credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer" });
  } catch {
    throw new Error(`Could not read the ${fileLabel}. The host must allow access from VirtualFace. You can also open the files from your device.`);
  }
  if (!response.ok) throw new Error(`The file host returned HTTP ${response.status}. Check the link or open a local file.`);
  if (!response.body) throw new Error("The link returned an empty file.");

  const finalUrl = new URL(response.url || url);
  checkLink(finalUrl);
  return { blob: await readLimitedBlob(response.body, maxSize, sizeLabel, signal), finalUrl };
}

async function loadLinkedArtwork(layout, artworkOverride, baseUrl, signal) {
  const artworkReference = artworkOverride || layout.artwork;
  if (!artworkReference) return layout;

  let artworkUrl;
  try {
    artworkUrl = new URL(artworkReference, artworkOverride ? undefined : baseUrl);
  } catch {
    throw new Error(artworkOverride || !baseUrl
      ? "Enter a direct HTTPS link to the image."
      : "Use a relative artwork path or a direct HTTPS link to the image.");
  }
  checkLink(artworkUrl);
  const fileId = driveFileId(artworkUrl);
  if (fileId) {
    const resourceKey = artworkUrl.searchParams.get("resourcekey");
    artworkUrl = new URL(`https://lh3.googleusercontent.com/d/${fileId}`);
    if (resourceKey) artworkUrl.searchParams.set("resourcekey", resourceKey);
  }
  const artwork = await readLinkedBlob(artworkUrl, signal, maxArtworkBytes, "artwork", "Artwork files can be up to 20 MiB.");
  return { ...layout, artworkUrl: await artworkObjectUrl(artwork.blob, signal) };
}

export async function readControllerUrl(value, signal, artworkOverride) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a direct HTTPS link to the JSON file.");
  }
  checkLink(url);
  if (driveFileId(url)) {
    throw new Error("For Google Drive layouts, download the JSON and open the files, or use a share link with the layout included.");
  }
  const { blob, finalUrl } = await readLinkedBlob(url, signal, maxBytes, "link", "Controller files can be up to 1 MiB.");
  return loadLinkedArtwork(parseControllerLayout(await blob.text()), artworkOverride, finalUrl, signal);
}

export async function readControllerSnapshot(base64urlGzip, artworkLink, signal) {
  const sizeLabel = "Controller layouts in share links can be up to 1 MiB uncompressed.";
  const maxEncodedSize = Math.ceil((maxBytes + 1024) * 4 / 3);
  const invalidMessage = "This share link contains an invalid compressed controller.";
  if (typeof base64urlGzip !== "string") throw new Error(invalidMessage);
  if (base64urlGzip.length > maxEncodedSize) throw new RangeError(sizeLabel);
  if (!/^[\w-]+$/.test(base64urlGzip) || base64urlGzip.length % 4 === 1) {
    throw new Error(invalidMessage);
  }
  if (typeof DecompressionStream !== "function") {
    throw new Error("This browser cannot open compressed controller links. Open the controller files instead.");
  }
  signal?.throwIfAborted();
  let blob;
  try {
    const base64 = base64urlGzip.replaceAll("-", "+").replaceAll("_", "/");
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    let offset = 0;
    // Small chunks let us stop inflating as soon as the output reaches its limit.
    const compressed = new ReadableStream({
      pull(controller) {
        const end = Math.min(offset + 1024, bytes.length);
        controller.enqueue(bytes.subarray(offset, end));
        offset = end;
        if (offset === bytes.length) controller.close();
      },
    });
    const stream = compressed.pipeThrough(new DecompressionStream("gzip"));
    blob = await readLimitedBlob(stream, maxBytes, sizeLabel, signal);
  } catch (error) {
    signal?.throwIfAborted();
    if (error instanceof RangeError) throw error;
    throw new Error(invalidMessage);
  }
  return loadLinkedArtwork(parseControllerLayout(await blob.text()), artworkLink, undefined, signal);
}
