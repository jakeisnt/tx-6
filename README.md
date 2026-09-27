# tx-6
Drive the teenage engineering TX-6 from JavaScript over MIDI. Two packages:

| package | what it is |
| --- | --- |
| [`@ulnd/tx-6`](packages/tx-6) | Headless driver. Decodes the TX-6's controls in any JavaScript runtime (browsers, Node, Bun, Deno, workers). No DOM or React. Ships Web Bluetooth and Web MIDI transports, and takes any transport you write. |
| [`@ulnd/use-tx-6`](packages/use-tx-6) | React hooks on top of `@ulnd/tx-6`. |

## References

- AI slop app that we can beat: https://tswitcher.app/
- TP-7 MIDI mapping that we can reverse-engineer: https://lucidyan.github.io/tp7-midi/, via https://github.com/lucidyan/tp7-midi
- `use-tx-6`: original framework that jump-started this. https://github.com/darnfish/use-tx-6
- Other resources: https://github.com/bnjreece/awesome-te?utm_source=chatgpt.com

## Installation
```
npm install @ulnd/tx-6                  # headless
npm install @ulnd/tx-6 @ulnd/use-tx-6   # React
```

## Putting the TX-6 in MIDI mode
`@ulnd/tx-6` reads the MIDI CC messages the TX-6 sends when **ctrl out** (controller mode) is on. That setting is off by default, so turn it on first:

1. Open the **system menu** and go to **midi**.
2. Turn the select encoder to find **CTRL** and tap select until it reads **OUT**.
3. Press **shift** to leave the menu. The **TX** marker on the display flickers when you move a fader.

To connect over **Bluetooth**, also go to **ble** in the system menu and pick **ACCEPT**. Bluetooth is off by default. Then connect with `webBluetooth()` from Chrome or Edge. Don't pick **SCAN**: in that mode the TX-6 looks for other devices to connect to and won't accept a browser.

To connect over **USB**, plug in a USB-C cable and use the `webMidi()` transport. `webMidi()` also works with a TX-6 you've paired over Bluetooth in your OS's MIDI settings.

See [docs/midi.md](docs/midi.md) for the full MIDI reference: every outgoing and incoming CC, notes, program changes, local control and the POTS/CC menu.

## Usage
### Headless
```ts
import { TX6 } from '@ulnd/tx-6'
import { webMidi } from '@ulnd/tx-6/web-midi'

const tx6 = new TX6({ transport: webMidi() })
tx6.on('input1.slider', ({ progress }) => console.log('fader 1', progress))
tx6.on('event', ({ event, ...params }) => console.log(event, params))

await tx6.connect()
```

The transports only use the Web Bluetooth or Web MIDI API they're given, so they also run outside a browser. Pass in any implementation of those APIs:

```ts
// Node: USB MIDI, or a TX-6 paired over Bluetooth in your OS, via a Web MIDI implementation such as `web-midi-api`
import { requestMIDIAccess } from 'web-midi-api'
const tx6 = new TX6({ transport: webMidi({ access: () => requestMIDIAccess() }) })

// Node: BLE MIDI via a Web Bluetooth implementation such as `webbluetooth`
import { bluetooth } from 'webbluetooth'
const tx6 = new TX6({ transport: webBluetooth({ bluetooth }) })
```

For anything else (a WebSocket bridge, a recording, a native MIDI library), implement `TX6Transport` and hand the transport raw MIDI bytes, or call `tx6.receive(bytes)` yourself.

### React
The following demo will let you adjust the font size of the text using the slider for channel 1:
```tsx
import useTX6, { useTX6Attribute } from '@ulnd/use-tx-6'

export default function App() {
  const { connect, status, error } = useTX6()

  const { progress = 0 } = useTX6Attribute('input1.slider')

  switch(status) {
  case 'disconnected':
    return (
      <>
        <button onClick={connect}>connect to TX-6</button>
        {error && (
          <p>error connecting to TX-6: {error.toString()}</p>
        )}
      </>
    )
  case 'connecting':
    return (
      <p>connecting to TX-6...</p>
    )
  }

  return (
    <span style={{ fontSize: `${progress * 100}px` }}>connected to TX-6</span>
  )
}
```

The hooks use Web Bluetooth by default. To use another transport, or share a device with non-React code, wrap your app in a provider:
```tsx
import { TX6 } from '@ulnd/tx-6'
import { webMidi } from '@ulnd/tx-6/web-midi'
import { TX6Provider } from '@ulnd/use-tx-6'

const device = new TX6({ transport: webMidi() })

<TX6Provider device={device}><App /></TX6Provider>
```

If you want to access multiple attributes at the same time, use `useTX6Attributes`—this is useful for the EQ knobs:
```tsx
const [{ progress: eq1 }, { progress: eq2 }, { progress: eq3 }] = useTX6Attributes(['input1.eq1', 'input1.eq2', 'input1.eq3'])
```

### Mapping and pairing
Controls are decoded from Control Change, Note On and Note Off messages on any channel, using the TX-6's default numbering (1–6 faders, 7–24 EQ, 25–30 channel buttons, 31 encoder, 32–37 select/fx1/fx2/shift/aux/cue). If your unit sends something else, pair sources to controls yourself:

```ts
const tx6 = new TX6({ transport: webBluetooth(), bindings: { 'cc:74': 'input1.slider' } })
tx6.bind('note:40', 'fx1')   // add or replace a pairing
tx6.unbind('note:40')        // back to the default map

// Every message, and what it decoded to; raw BLE-MIDI packets arrive on 'packet'
tx6.on('message', (message, { origin, source, event }) => console.log(source, event))
```

## Development
This is a Bun workspace: `packages/tx-6`, `packages/use-tx-6` and `demo`.

```
bun install
bun run check   # lint, typecheck, test, build, and a smoke test of the builds in plain Node
bun run pack    # build both packages into packed/*.tgz, as they'd be published
```

### Releasing
Bump `version` in both `packages/*/package.json` (keep them in step: `@ulnd/use-tx-6` peers on `^` the same version of `@ulnd/tx-6`), then push a `v<version>` tag. The [release workflow](.github/workflows/release.yml) checks, packs and publishes both packages to npm with provenance.

The workflow publishes with npm [trusted publishing](https://docs.npmjs.com/trusted-publishers) when it's configured for both packages, or else with an `NPM_TOKEN` repository secret. Trusted publishing can only be set up for a package that already exists, so the first release needs the token (or a manual `npm publish packed/<file>.tgz --access public`).

## Demo
The demo shows a raw log of every BLE-MIDI packet and the messages parsed from it. **pair controls** lets you click a control on the drawing and then move it on the TX-6 to pair them. Pairings are saved in the browser.

The `demo/` workspace is a browser remote for the TX-6, deployed as a static-assets [Cloudflare Worker](https://developers.cloudflare.com/workers/static-assets/) configured in `wrangler.jsonc`.

```
bun run demo          # local dev server
bun run demo:preview  # build and serve with the Workers runtime
bun run demo:deploy   # build and deploy with wrangler
```

`wrangler deploy` runs the demo build itself, so connecting the repo to Cloudflare Workers Builds needs no extra build command.

## Thanks
Inspired by [this demo](https://twitter.com/hturan/status/1523702486258782208) by [@hturan@twitter.com](https://twitter.com/hturan).

## License
MIT
