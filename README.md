# useTX6
A set of React hooks for interacting with teenage engineering TX-6 over BLE MIDI

## Installation
```
yarn add use-tx-6
```

## Putting the TX-6 in MIDI mode
`use-tx-6` reads the MIDI CC messages the TX-6 sends when **ctrl out** (controller mode) is on. That setting is off by default, so turn it on first:

1. Open the **system menu** and go to **midi**.
2. Turn the select encoder to find **CTRL** and tap select until it reads **OUT**.
3. Press **shift** to leave the menu. The **TX** marker on the display flickers when you move a fader.

To connect over **Bluetooth**, also go to **ble** in the system menu and pick **ACCEPT**. Bluetooth is off by default. Then connect with `webBluetooth()` from Chrome or Edge. Don't pick **SCAN**: in that mode the TX-6 looks for other devices to connect to and won't accept a browser.

To connect over **USB**, plug in a USB-C cable and use the `webMidi()` transport. `webMidi()` also works with a TX-6 you've paired over Bluetooth in your OS's MIDI settings.

See [docs/midi.md](docs/midi.md) for the full MIDI reference: every outgoing and incoming CC, notes, program changes, local control and the POTS/CC menu.

## Usage
The following demo will let you adjust the font size of the text using the slider for channel 1:
```tsx
import useTX6, { useTX6Attribute } from 'use-tx-6'

export default function App() {
  const { connect, status, error } = useTX6()

  const { progress } = useTX6Attribute('input1.slider')

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

If you want to access multiple attributes at the same time, use `useTX6Attributes`—this is useful for the EQ knobs:
```tsx
const [{ progress: eq1 }, { progress: eq2 }, { progress: eq3 }] = useTX6Attributes(['input1.eq1', 'input1.eq2', 'input1.eq3'])
```

## Demo
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
