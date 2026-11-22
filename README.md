# VirtualFace

A browser instrument for exploring microtonal keyboard layouts. The first layout is Martin Vogel’s special manual for Hans-André Stamm’s Enharmonic Pipe Organ, formerly at the Prayner Konservatorium in Vienna.

## Play

- Hold a key with a mouse or touchscreen. Touch several keys for chords, or slide across them to change notes.
- Choose **Fullscreen** to expand the playing surface. When native fullscreen is unavailable, the keyboard fills the browser viewport.
- Open **MIDI**, choose **Enable MIDI**, and select your input and output devices. Incoming Note On and Note Off messages control the highlights. Mouse and touch send Note On and Note Off to the selected output.
- For keyboard navigation, Tab to the manual, move with the arrow keys, and hold Space or Enter to play.
- Hover over a key or focus it to see its MIDI note and channel below the manual. Use **Release all notes** in the MIDI panel to clear held notes.

## Vogel layout and MIDI

The shapes and pitch labels follow [Vogel’s drawing, reproduced on page 5 of Ulf-Diether Soyka’s report](https://www.soyka-musik.at/media/content/downloads/u.-d._soyka_arbeitsbericht_sinfonie_in_yes-dur_die_unspielbare.pdf#page=5). The transcription covers 145 labeled key positions in the published excerpt. [Stamm’s technical description](https://eufonia.de/the-enharmonic-pipe-organ/) explains the 48 pitches per octave and the physical console.

VirtualFace assigns each drawn key its own MIDI address in nominal pitch order. The first channel uses notes 24–127 and the next channel uses notes 24–64. These default to channels 1 and 2. The input and output base channels can be changed separately, and the next channel wraps from 16 to 1.

These are VirtualFace’s addresses. The organ’s hardware MIDI map and measured tuning have yet to be verified. MIDI Note On and Off carry key addresses. To hear the intended microtonal pitches, route the output to a sound source configured for the map in [layouts/vogel.js](layouts/vogel.js). Its ratios are nominal values derived from the drawing, with octave placement inferred.

## Run locally

Serve this directory over HTTPS or localhost from a browser that supports [Web MIDI](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API). The visual keyboard works without MIDI permission.

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000/>. No build or installation is required. For GitHub Pages, use the root of the `main` branch as the publishing source.
