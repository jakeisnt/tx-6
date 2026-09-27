# @ulnd/tp-7
Headless driver for the teenage engineering TP-7 field recorder over MIDI. Decodes its reel and buttons in any JavaScript runtime: browsers, Node, Bun, Deno and workers. No DOM or React. React hooks are in [`@ulnd/use-tp-7`](https://www.npmjs.com/package/@ulnd/use-tp-7), and there's a live remote at [tp-7.jake.kitchen](https://tp-7.jake.kitchen).

```
npm install @ulnd/tp-7
```

```ts
import { TP7 } from '@ulnd/tp-7'
import { webMidi } from '@ulnd/tp-7/web-midi'           // USB, or BLE paired in your OS
// import { webBluetooth } from '@ulnd/tp-7/web-bluetooth'  // BLE MIDI from the browser

const tp7 = new TP7({ transport: webMidi() })
tp7.on('reel', ({ delta }) => console.log('reel turned', delta))
tp7.on('record', ({ pressed }) => console.log('record', pressed))

await tp7.connect()
```

## Controls
| control | kind | payload |
| --- | --- | --- |
| `reel` | relative encoder | `{ direction, delta, value }` |
| `button1`, `button2`, `button3` | button | `{ pressed, value }` |
| `record`, `play`, `stop` | button | `{ pressed, value }` |

**The controller numbers are unverified.** teenage engineering doesn't publish a TP-7 controller map, so the defaults in [docs/tp-7-midi.md](https://github.com/jakeisnt/tx-6/blob/main/docs/tp-7-midi.md) are placeholders. Pair what your TP-7 actually sends:

```ts
const tp7 = new TP7({ transport: webMidi(), bindings: { 'cc:20': 'reel' } })
tp7.bind('note:60', 'record')

// Every message, and what it decoded to
tp7.on('message', (message, { source, event }) => console.log(source, event))
```

Outside a browser, give the transports a Web MIDI or Web Bluetooth implementation (`webMidi({ access })`, `webBluetooth({ bluetooth })`). You can also write your own `TP7Transport`, or feed bytes in with `tp7.receive()`.

## License
MIT
