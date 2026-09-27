# @ulnd/teenage
Drive teenage engineering devices from JavaScript over MIDI: the **TX-6** mixer, the **TP-7** field recorder and the **OP-1 field** synthesizer. It decodes their knobs, faders, encoders and buttons in any JavaScript runtime (browsers, Node, Bun, Deno, workers), and includes React hooks and an API for describing your own devices.

```
npm install @ulnd/teenage
```

| import | what it has |
| --- | --- |
| `@ulnd/teenage` | `TX6`, `TP7`, `OP1`, their profiles and types, and `TEDevice` / `defineDevice` for your own devices. No DOM or React. |
| `@ulnd/teenage/web-midi` | `webMidi(profile)`: USB, or a device paired over Bluetooth in your OS |
| `@ulnd/teenage/web-bluetooth` | `webBluetooth(profile)`: BLE MIDI from the browser (Chrome, Edge) |
| `@ulnd/teenage/react` | React hooks for any device. React is an optional peer, needed only here. |

## Headless
```ts
import { TX6, tx6Profile } from '@ulnd/teenage'
import { webMidi } from '@ulnd/teenage/web-midi'

const tx6 = new TX6({ transport: webMidi(tx6Profile) })
tx6.on('input1.slider', ({ progress }) => console.log('fader 1', progress))
tx6.on('event', ({ event, ...params }) => console.log(event, params))

await tx6.connect()
```

`TP7` with `tp7Profile` and `OP1` with `op1Profile` work the same way. A transport takes the device's profile so it knows what to look for; in browsers, `connect()` over Web Bluetooth must run in a user gesture such as a click handler.

The transports only use the Web MIDI or Web Bluetooth API they're given, so they also run outside a browser:

```ts
// Node: a Web MIDI implementation such as `web-midi-api`
import { requestMIDIAccess } from 'web-midi-api'
const tx6 = new TX6({ transport: webMidi(tx6Profile, { access: () => requestMIDIAccess() }) })

// Node: a Web Bluetooth implementation such as `webbluetooth`
import { bluetooth } from 'webbluetooth'
const op1 = new OP1({ transport: webBluetooth(op1Profile, { bluetooth }) })
```

For anything else (a WebSocket bridge, a recording, a native MIDI library), implement `TEDeviceTransport` and hand it raw MIDI bytes, or call `device.receive(bytes)` yourself.

## React
Put a device in a `DeviceProvider`, and the hooks below read it:

```tsx
import { TX6, tx6Profile } from '@ulnd/teenage'
import { DeviceProvider, useConnection, useControl } from '@ulnd/teenage/react'
import { webBluetooth } from '@ulnd/teenage/web-bluetooth'

const tx6 = new TX6({ transport: webBluetooth(tx6Profile) })

export default function App() {
  return <DeviceProvider device={tx6}><Mixer /></DeviceProvider>
}

function Mixer() {
  const { status, error, connect } = useConnection<TX6>()
  const { progress = 0 } = useControl<TX6>('input1.slider')

  if(status !== 'connected')
    return <button onClick={connect}>connect to TX-6</button>

  return <span style={{ fontSize: `${progress * 100}px` }}>connected</span>
}
```

Every hook also takes the device as its last argument, which skips the provider and types the result exactly:

```ts
const { progress } = useControl('input1.slider', tx6)   // Partial<{ progress, value }>
const [eq1, eq2] = useControls(['input1.eq1', 'input1.eq2'], tx6)
```

| hook | returns |
| --- | --- |
| `useConnection(device?)` | `{ device, status, error, connect, disconnect }` |
| `useControl(control, device?)` | the control's latest payload, or `{}` until it first moves |
| `useControls(controls, device?)` | several payloads at once, in the order given |
| `useDeviceEvent(event, listener, device?)` | nothing: calls `listener` while mounted. Use it for encoders, which report turns rather than a position |
| `useDevice(device?)` | the device itself |

With a type argument instead of a device (`useControl<TX6>('fx1')`), the control name is still checked, but the payload includes every field that control's kind could have. To skip the type argument everywhere, register your app's device once:

```ts
declare module '@ulnd/teenage/react' {
  interface Register { device: TX6 }
}
```

## Controls and pairing
Each device has a controller map; see its MIDI reference for the numbers and how to put the device in MIDI mode:
- [TX-6](https://github.com/jakeisnt/tx-6/blob/main/docs/tx-6-midi.md): `input1.slider`–`input6.slider`, `input1.eq1`–`input6.eq3`, `input1.button`–`input6.button`, `select.encoder`, `select.button`, `fx1`, `fx2`, `shift`, `aux`, `cue`
- [TP-7](https://github.com/jakeisnt/tx-6/blob/main/docs/tp-7-midi.md): `reel`, `button1`–`button3`, `record`, `play`, `stop`
- [OP-1 field](https://github.com/jakeisnt/tx-6/blob/main/docs/op-1-midi.md): `blue.encoder` … `orange.encoder` and their pushes (`blue.button` …), plus the function keys

**Only the TX-6 map is verified on hardware.** If your device sends something else, pair sources to controls:

```ts
const tp7 = new TP7({ transport: webMidi(tp7Profile), bindings: { 'cc:20': 'reel' } })
tp7.bind('note:60', 'record')   // add or replace a pairing
tp7.unbind('note:60')           // back to the default map

// Every message, and what it decoded to; raw BLE-MIDI packets arrive on 'packet'
tp7.on('message', (message, { source, event }) => console.log(source, event))
```

## Your own device
Describe the controls, and you get the same class, transports and hooks:

```ts
import { defineDevice, TEDevice } from '@ulnd/teenage'
import { webMidi } from '@ulnd/teenage/web-midi'

const knobsProfile = defineDevice<{ volume: 'knob', play: 'button', jog: 'encoder' }>({
  name: 'Knobs',
  midiInputPattern: /knobs/i,
  controllers: new Map([
    [7, { event: 'volume', kind: 'knob' }],
    [64, { event: 'play', kind: 'button' }],
    [10, { event: 'jog', kind: 'encoder' }]
  ])
})

const knobs = new TEDevice(knobsProfile, { transport: webMidi(knobsProfile) })
knobs.on('volume', ({ progress }) => console.log(progress))
```

## License
MIT
