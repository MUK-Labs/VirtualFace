# VirtualFace

A browser instrument for exploring microtonal keyboard layouts. [Open VirtualFace](https://muk-labs.github.io/VirtualFace/).

## Play

- Choose **Stamm’s built manual** or **Vogel’s 1968 drawing** from the layout selector. The built manual is the default. [Open the original Vogel view](https://muk-labs.github.io/VirtualFace/?layout=vogel).
- Hold a key with a mouse or touchscreen, or touch several keys for a chord. The **Sine** button mutes or enables the browser’s reference tone.
- Tab to the manual, use the arrow keys to move, and hold Space or Enter to play. **Fullscreen** expands the playing surface.
- Hover over or focus a key to see its reference frequency and raw MIDI address. The app sets the diagram’s reference C to MIDI 60 (about 261.63 Hz).

## MIDI

Open **MIDI**, choose **Enable MIDI**, and select your devices. Input accepts raw key addresses for the chosen layout and lights the keys. **Release all notes** clears held input and output notes.

| Output format | What it sends |
| --- | --- |
| **Raw key addresses** | A distinct MIDI channel and note for each physical key position. Use this for recording gestures or controlling a custom patch. |
| **Note + pitch bend** | The nearest MIDI note and a bend for the key’s nominal tuning. Set the receiving instrument’s bend range to match VirtualFace (default ±2 semitones). |

For tuned output, choose **Multiple channels** if the receiving instrument or DAW patch preserves independent pitch bends on different channels. VirtualFace allocates one channel per held note, up to 15, and skips channel 10. Choose **Single channel** for a receiver that listens to one channel. This mode plays one tuned note at a time. The two formats are selectable on the same output port.

The Stamm reconstruction uses eight raw MIDI channels by default. The Vogel layout uses two (notes 24–127 on channel 1 and notes 24–64 on channel 2). For either layout, raw addresses start at note 24 on each consecutive channel. Use the MIDI panel to select the base channels. Channel numbering wraps from 16 to 1.

## Sources and tuning

[Stamm’s description and photos](https://eufonia.de/the-enharmonic-pipe-organ/) document the built special manual. [Soyka’s report, pp. 4–5](https://www.soyka-musik.at/media/content/downloads/u.-d._soyka_arbeitsbericht_sinfonie_in_yes-dur_die_unspielbare.pdf#page=4) shows the organ and reproduces Vogel’s labeled 1968 drawing. The original VirtualFace layout transcribes 145 labeled positions in that drawing.

The built-manual view reconstructs the staggered special manual from photographs, including the split walnut keys and round septimal buttons. Some positions at the edges are estimated. Its pitches and octave placement use a theoretical model derived from Vogel’s notation. The two halves of each split key share a nominal pitch and have distinct raw addresses. Both layouts use VirtualFace’s own MIDI map. Measurements of the pipes and the organ’s hardware MIDI map would be needed to calibrate the reconstruction.

## Run locally

Serve this directory over HTTPS or localhost from a browser that supports [Web MIDI](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API). The manual and the reference tone work without MIDI permission.

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000/>. No build or installation is required.
