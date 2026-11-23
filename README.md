# VirtualFace

A browser instrument for exploring microtonal keyboard layouts. [Open VirtualFace](https://muk-labs.github.io/VirtualFace/).

## Play

- Choose **Stamm’s built manual** or **Vogel’s 1968 drawing** from the layout selector. The built manual is the default. [Open the original Vogel view](https://muk-labs.github.io/VirtualFace/?layout=vogel).
- Hold a key with a mouse or touchscreen, or touch several keys for a chord. The **Sine** button mutes or enables the browser’s reference tone.
- Tab to the manual, use the arrow keys to move, and hold Space or Enter to play. **Fullscreen** expands the playing surface.
- Hover over or focus a key to see its reference frequency and raw MIDI address. The app sets the diagram’s reference C to MIDI 60 (about 261.63 Hz).

## Guide

Read the [VirtualFace guide](https://muk-labs.github.io/VirtualFace/guide.html) for the history of both layouts, how the tuning works, and a worked example.

## MIDI

The guide covers raw input, raw and tuned outputs, and pitch-bend settings. [MIDI setup and address mapping](https://muk-labs.github.io/VirtualFace/guide.html#midi)

## Custom controllers

Choose **Open controller…** in the layout menu to open a local JSON file or a direct HTTPS link. Local files stay in the current browser tab. A single file defines the layout, raw MIDI addresses, and optional tuning. [JSON format](https://muk-labs.github.io/VirtualFace/guide.html#custom-layouts) · [Example JSON](examples/controller.json)

Share a linked layout with the `controller` query parameter and, for a separately linked image, the optional `artwork` parameter. Use a URL-encoded HTTPS link for each file. Public Google Drive image links are supported for artwork. A `#controller=` fragment can carry the layout as gzipped, base64url-encoded JSON.

## Sources and tuning

The guide links to the original drawing, photographs, and technical sources. [The two layouts](https://muk-labs.github.io/VirtualFace/guide.html#layouts) · [Tuning and notation](https://muk-labs.github.io/VirtualFace/guide.html#tuning)

## Run locally

Serve this directory over HTTPS or localhost from a browser that supports [Web MIDI](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API). The manual and the reference tone work without MIDI permission.

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000/>. No build or installation is required.
