# OP-1 field MIDI reference

> **Unverified on the OP-1 field.** These are the controller numbers the original OP-1 sends in CTRL mode (**shift + com → ctrl**), taken from its widely used controller mappings. The OP-1 field is believed to keep them, but nobody has checked on a real field yet. If you have one, open [op-1.jake.kitchen](https://op-1.jake.kitchen), expand **midi log & pairing**, and press each key. The log shows what it actually sends. Please open an issue or PR with any corrections.

Until the map is confirmed, pair controls yourself: use **pair controls** on the site, or call `op1.bind('cc:<n>', '<control>')` in code. Pairings take precedence over the defaults below, and the site saves them in your browser.

## Connecting
- **USB:** connect the OP-1 field with a USB-C cable and use the `webMidi(op1Profile)` transport (the **midi** button on the site). The input is picked by name (`/op-?1/i`); pass `selectInput` to choose another.
- **Bluetooth:** turn on Bluetooth MIDI on the OP-1 field and use `webBluetooth(op1Profile)` from Chrome or Edge. Or pair it with your operating system and use `webMidi(op1Profile)`.

Turn on the controller (CC) output and MIDI out in the OP-1 field's MIDI settings. See teenage engineering's [OP-1 field guide](https://teenage.engineering/guides/op-1-field) for where those settings are in the current firmware.

## Default map (unverified on the field)
Control Change on any channel.

### Encoders
Relative: 1–63 clockwise, 65–127 counter-clockwise.

| CC | control | push (button) CC | push control |
| --- | --- | --- | --- |
| 1 | `blue.encoder` | 64 | `blue.button` |
| 2 | `green.encoder` | 65 | `green.button` |
| 3 | `white.encoder` | 66 | `white.button` |
| 4 | `orange.encoder` | 67 | `orange.button` |

### Keys
Buttons, pressed at 64 and above.

| CC | control | CC | control |
| --- | --- | --- | --- |
| 5 | `help` | 26 | `sequencer` |
| 6 | `metronome` | 38 | `record` |
| 7 | `synth` | 39 | `play` |
| 8 | `drum` | 40 | `stop` |
| 9 | `tape` | 41 | `left` |
| 10 | `mixer` | 42 | `right` |
| 11 | `t1` | 43 | `shift` |
| 12 | `t2` | 48 | `mic` |
| 13 | `t3` | 49 | `com` |
| 14 | `t4` | 50–57 | `ss1`–`ss8` |
| 15 | `up` | | |
| 16 | `down` | | |
| 17 | `scissors` | | |

### Keyboard
The keyboard sends Note On and Note Off. At the default octave the two octaves run from F (note 53) to E (note 76), and the octave keys shift that range. Notes aren't mapped to controls by default: they arrive on the `message` event, and the site lights them on its keyboard. Pair a note with `op1.bind('note:<n>', '<control>')` to use it as a button.

The map lives in [`packages/op-1/src/controls.ts`](../packages/op-1/src/controls.ts).
