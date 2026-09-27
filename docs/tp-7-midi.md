# TP-7 MIDI reference

> **Unverified.** teenage engineering doesn't publish a controller map for the TP-7, and nobody has checked this one on a real unit yet. Every number below is a placeholder that `@ulnd/teenage` uses by default. If you have a TP-7, open [tp-7.jake.kitchen](https://tp-7.jake.kitchen), expand **midi log & pairing**, and move each control. The log shows what it actually sends. Please open an issue or PR with the real numbers.

Until the map is confirmed, pair controls yourself: use **pair controls** on the site, or call `tp7.bind('cc:<n>', '<control>')` in code. Pairings take precedence over the defaults below, and the site saves them in your browser.

## Connecting
- **USB:** connect the TP-7 with a USB-C cable and use the `webMidi(tp7Profile)` transport (the **midi** button on the site). The input is picked by name (`/tp-?7/i`); pass `selectInput` to choose another.
- **Bluetooth:** if your TP-7 advertises BLE MIDI, use `webBluetooth(tp7Profile)` from Chrome or Edge. Or pair it with your operating system and use `webMidi(tp7Profile)`.

See teenage engineering's [TP-7 guide](https://teenage.engineering/guides/tp-7) for the device's current MIDI settings.

## Default map (unverified)
Control Change on any channel. Notes aren't mapped by default.

| CC | control | kind |
| --- | --- | --- |
| 1 | `reel` | relative encoder: 1–63 clockwise, 65–127 counter-clockwise |
| 2 | `button1` | button: pressed at 64 and above |
| 3 | `button2` | button |
| 4 | `button3` | button |
| 5 | `record` | button |
| 6 | `play` | button |
| 7 | `stop` | button |

The map lives in [`packages/tp-7/src/controls.ts`](../packages/tp-7/src/controls.ts).
