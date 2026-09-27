# TX-6 MIDI reference

These notes cover everything `@ulnd/tx-6` ([`packages/tx-6/core`](../packages/tx-6/core)) needs from the TX-6's MIDI features. They summarise the MIDI sections of teenage engineering's [TX-6 guide](https://teenage.engineering/guides/tx-6) (midi, midi CC, ble and the midi reference). Check the official guide for the latest firmware behaviour.

## Putting the TX-6 in MIDI mode

`@ulnd/tx-6` listens for the Control Change messages that the TX-6 sends when **ctrl out** is on. The TX-6 calls this *controller mode*. MIDI goes out over USB and Bluetooth LE (BLE).

1. Open the **system menu** and go to **midi**.
2. Turn the select encoder to pick a setting, and tap select to change it.
3. Set **CTRL** to **OUT**. The TX-6 now sends a MIDI CC every time you move a knob or fader or press a button.
4. Press **shift** to leave the menu.

The **RX** and **TX** markers on the display light up when MIDI comes in or goes out. If TX doesn't flicker when you move a fader, ctrl out is still off.

### Over Bluetooth

Bluetooth is **off by default**.

1. Open the **system menu** and go to **ble**.
2. Pick **ACCEPT** (device mode). BLE is now on and the TX-6 accepts connections from BLE MIDI hosts such as a browser or computer.
3. In the demo or your app, click **connect bluetooth** and choose the TX-6 in the browser's pairing dialog. Web Bluetooth needs Chrome or Edge.

The **SCAN** (host) setting is for the opposite setup. In SCAN the TX-6 looks for BLE MIDI devices and connects to the one with the strongest signal. Don't use it with `@ulnd/tx-6`.

If several TX-6 units are nearby, rename yours with **name** in the system menu. Turn the encoder to pick each letter and press select to move to the next one. The name you set is what the TX-6 advertises over BLE.

### Over USB

Connect the TX-6 with a USB-C cable and use the `webMidi()` transport (the **midi** button in the demo). This transport also works with a TX-6 that you've paired over Bluetooth in your operating system's MIDI settings.

## midi menu settings

| setting | effect |
|---|---|
| ctrl in | Accepts incoming MIDI CC and program change, so another device can control the TX-6. |
| ctrl out | Sends MIDI CC whenever a knob or fader moves or a button is pressed. **`@ulnd/tx-6` needs this setting.** |
| note on | Accepts incoming MIDI notes, for playing the built-in synthesizer. |
| ctrl off + note off | Turns off all incoming and outgoing MIDI. |

The TX-6 also sends and receives MIDI clock and transport control.

Tip: when another device controls the TX-6 over MIDI, you can turn off the TX-6's own knobs and faders with *local control off* (CC 122 on channel 7, see below).

## midi CC (POTS menu)

When the TX-6 is part of a larger setup, individual knobs can send MIDI CC to external gear. Set a knob's function to **CC** in the **POTS** menu, using the custom or per-track setting, and then set its channel and CC number in the **CC** menu. Each pot can have its own MIDI channel and CC. Only pots set to CC in the POTS menu send these messages.

Knobs set to custom CCs don't send the CC numbers listed below, so `@ulnd/tx-6` won't recognise them.

## Outgoing MIDI messages in controller mode

These are the messages `@ulnd/tx-6` decodes (see [`packages/tx-6/src/controls.ts`](../packages/tx-6/src/controls.ts)).

| control | cc | channel | range |
|---|---|---|---|
| faders | 1–6 | 1 | 0–127 |
| upper knob | 7–12 | 1 | 0–127 |
| middle knob | 13–18 | 1 | 0–127 |
| lower knob | 19–24 | 1 | 0–127 |
| track buttons | 25–30 | 1 | 0 / 127 |
| encoder turn | 31 | 1 | −64 – +63 |
| encoder button | 32 | 1 | 0 / 127 |
| FX I button | 33 | 1 | 0 / 127 |
| FX II button | 34 | 1 | 0 / 127 |
| shift button | 35 | 1 | 0 / 127 |
| aux button | 36 | 1 | 0 / 127 |
| cue button | 37 | 1 | 0 / 127 |

## Incoming MIDI control messages

Channels 1–6 control tracks 1–6. Channel 7 is the main mix and global controls, and channels 8–9 are FX I and FX II.

| control | cc | channel | range |
|---|---|---|---|
| track volume | 7 | 1–6 | 0–127 |
| panning / balance | 8 | 1–6 | 0–127 |
| gain | 9 | 1–6 | 0–127 |
| seq pattern | 14 | 1–6 | 0–127 |
| mute / solo | 120 | 1–6 | on / off |
| filter frequency | 74 | 1–6 | 0–127 |
| EQ high | 85 | 1–6 | 0–127 |
| EQ mid | 86 | 1–6 | 0–127 |
| EQ low | 87 | 1–6 | 0–127 |
| compressor amount | 93 | 1–6 | 0–127 |
| synth waveform | 3 | 1–6 | 0–127 |
| synth frequency | 89 | 1–6 | 0–127 |
| synth length | 90 | 1–6 | 0–127 |
| synth detune | 95 | 1–6 | 0–127 |
| FX I send | 91 | 1–6 | 0–127 |
| aux send | 92 | 1–6 | 0–127 |
| aux II send | 94 | 1–6 | 0–127 |
| main volume | 7 | 7 | 0–127 |
| aux volume | 14 | 7 | 0–127 |
| cue volume | 15 | 7 | 0–127 |
| local control\* | 122 | 7 | on / off |
| FX I / FX II enable | 82 | 8–9 | on / off |
| FX I / FX II engine | 15 | 8–9 | 0–127 |
| FX I / FX II parameter 1 | 12 | 8–9 | 0–127 |
| FX I / FX II parameter 2 | 13 | 8–9 | 0–127 |
| FX I / FX II parameter 3 | 14 | 8–9 | 0–127 |
| FX I return level | 7 | 8 | 0–127 |
| FX II track select | 9 | 9 | 0–127 |
| start / stop toggle | 46 | 7 | on |
| tempo (relative) | 47 | 7 | −64 – +63 |

\* Local control off turns off all TX-6 knobs and faders.

For on / off values, 0–63 means off and 64–127 means on.

## Incoming MIDI note messages (internal synth / sequencer)

| channel | note | track | function |
|---|---|---|---|
| 1 | C0–B8 | 1 | frequency (chromatic) |
| 2 | C0–B8 | 2 | frequency (chromatic) |
| 3 | C0–B8 | 3 | frequency (chromatic) |
| 4 | C0–B8 | 4 | frequency (chromatic) |
| 5 | C0–B8 | 5 | frequency (chromatic) |
| 6 | C0–B8 | 6 | frequency (chromatic) |
| 7 | C | 1 | parameter |
| 7 | D | 2 | parameter |
| 7 | E | 3 | parameter |
| 7 | F | 4 | parameter |
| 7 | G | 5 | parameter |
| 7 | A | 6 | parameter |

## Incoming MIDI program change messages

| program | channel | scene slot |
|---|---|---|
| 1 | 7 | A |
| 2 | 7 | B |
| 3 | 7 | B\* |

\* The official guide lists slot B for both programs 2 and 3. Program 3 is probably slot C.
