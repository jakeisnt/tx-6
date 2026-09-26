# @ulnd/tx-6
Headless driver for the teenage engineering TX-6 over MIDI. Decodes its faders, EQ knobs, buttons and encoder in any JavaScript runtime: browsers, Node, Bun, Deno and workers. No DOM or React.

```
npm install @ulnd/tx-6
```

```ts
import { TX6 } from '@ulnd/tx-6'
import { webMidi } from '@ulnd/tx-6/web-midi'           // USB, or BLE paired in your OS
// import { webBluetooth } from '@ulnd/tx-6/web-bluetooth'  // BLE MIDI from the browser

const tx6 = new TX6({ transport: webMidi() })
tx6.on('input1.slider', ({ progress }) => console.log('fader 1', progress))

await tx6.connect()
```

Outside a browser, pass the transports a Web MIDI or Web Bluetooth implementation (`webMidi({ access })`, `webBluetooth({ bluetooth })`), write your own `TX6Transport`, or feed bytes in with `tx6.receive()`.

The TX-6 must have **ctrl out** turned on. For setup, React hooks ([`@ulnd/use-tx-6`](https://www.npmjs.com/package/@ulnd/use-tx-6)) and the full MIDI reference, see the [repository](https://github.com/jakeisnt/tx-6#readme).

## License
MIT
