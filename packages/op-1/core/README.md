# @ulnd/op-1
Headless driver for the teenage engineering OP-1 field over MIDI. Decodes its four encoders and its function keys in any JavaScript runtime: browsers, Node, Bun, Deno and workers. No DOM or React. React hooks are in [`@ulnd/use-op-1`](https://www.npmjs.com/package/@ulnd/use-op-1), and there's a live remote at [op-1.jake.kitchen](https://op-1.jake.kitchen).

```
npm install @ulnd/op-1
```

```ts
import { OP1 } from '@ulnd/op-1'
import { webMidi } from '@ulnd/op-1/web-midi'           // USB, or BLE paired in your OS
// import { webBluetooth } from '@ulnd/op-1/web-bluetooth'  // BLE MIDI from the browser

const op1 = new OP1({ transport: webMidi() })
op1.on('blue.encoder', ({ delta }) => console.log('blue encoder', delta))
op1.on('play', ({ pressed }) => console.log('play', pressed))

await op1.connect()
```

## Controls
| control | kind | payload |
| --- | --- | --- |
| `blue.encoder`, `green.encoder`, `white.encoder`, `orange.encoder` | relative encoder | `{ direction, delta, value }` |
| `blue.button` … `orange.button` (pushing an encoder) | button | `{ pressed, value }` |
| `shift`, `help`, `metronome`, `synth`, `drum`, `tape`, `mixer`, `t1`–`t4`, `record`, `play`, `stop`, `left`, `right`, `up`, `down`, `scissors`, `sequencer`, `mic`, `com`, `ss1`–`ss8` | button | `{ pressed, value }` |

Keyboard keys send notes and aren't mapped to controls, because the octave setting changes which note each key sends. They still arrive on `message`, and you can pair a note to any control with `bind()`.

**The controller numbers are unverified on the OP-1 field.** They're the ones the original OP-1 sends in CTRL mode, and the field is believed to use the same ones. See [docs/op-1-midi.md](https://github.com/jakeisnt/tx-6/blob/main/docs/op-1-midi.md). If yours differ, pair them:

```ts
const op1 = new OP1({ transport: webMidi(), bindings: { 'cc:40': 'play' } })
op1.bind('cc:41', 'stop')
```

Outside a browser, give the transports a Web MIDI or Web Bluetooth implementation (`webMidi({ access })`, `webBluetooth({ bluetooth })`). You can also write your own `OP1Transport`, or feed bytes in with `op1.receive()`.

## License
MIT
