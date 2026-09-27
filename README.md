# teenage engineering over MIDI
Drive teenage engineering devices from JavaScript: the **TX-6** mixer, the **TP-7** field recorder and the **OP-1 field** synthesizer. It's all one package, [`@ulnd/teenage`](packages/teenage), and each device also has a browser remote of its own.

| device | class | site | MIDI reference |
| --- | --- | --- | --- |
| TX-6 | `TX6` | [tx-6.jake.kitchen](https://tx-6.jake.kitchen) | [docs/tx-6-midi.md](docs/tx-6-midi.md) |
| TP-7 | `TP7` | [tp-7.jake.kitchen](https://tp-7.jake.kitchen) | [docs/tp-7-midi.md](docs/tp-7-midi.md) |
| OP-1 field | `OP1` | [op-1.jake.kitchen](https://op-1.jake.kitchen) | [docs/op-1-midi.md](docs/op-1-midi.md) |

```
npm install @ulnd/teenage
```

```ts
import { TX6, tx6Profile } from '@ulnd/teenage'
import { webMidi } from '@ulnd/teenage/web-midi'

const tx6 = new TX6({ transport: webMidi(tx6Profile) })
tx6.on('input1.slider', ({ progress }) => console.log('fader 1', progress))
await tx6.connect()
```

```tsx
import { DeviceProvider, useConnection, useControl } from '@ulnd/teenage/react'

<DeviceProvider device={tx6}><Mixer /></DeviceProvider>

function Mixer() {
  const { status, connect } = useConnection<TX6>()
  const { progress = 0 } = useControl<TX6>('input1.slider')
}
```

The drivers decode controls in any JavaScript runtime (browsers, Node, Bun, Deno, workers), with no DOM or React. React is an optional peer, needed only for `@ulnd/teenage/react`. See the [package README](packages/teenage/README.md) for the full API: transports, hooks, pairing, and defining your own device.

> **Only the TX-6 map is verified on hardware.** The TP-7 and OP-1 field maps are best-effort guesses, and every unconfirmed number is marked in the code and docs. Until they're confirmed, pair controls with `device.bind(source, control)` or use pairing mode on the sites. Corrections are welcome.

## References

- AI slop app that we can beat: https://tswitcher.app/
- TP-7 MIDI mapping that we can reverse-engineer: https://lucidyan.github.io/tp7-midi/, via https://github.com/lucidyan/tp7-midi
- `use-tx-6`: original framework that jump-started this. https://github.com/darnfish/use-tx-6
- Other resources: https://github.com/bnjreece/awesome-te?utm_source=chatgpt.com

## How it fits together
```
packages/
  teenage/        @ulnd/teenage   the only published package; bundles everything below
  te-device/      private         shared core: MIDI and BLE-MIDI parsing, transports,
                                  the connection state machine, pairing, defineDevice()
  use-te-device/  private         React hooks for any device
  tx-6/ tp-7/ op-1/  private      per device: a control map, a TEDevice subclass, names
sites/
  te-site-kit/    private         shared site UI: toolbar, cross-site nav, MIDI log,
                                  pairing, generic dials and keys, Vite config
  tx-6/ tp-7/ op-1/               one Vite app and Cloudflare Worker per device
```

Only `@ulnd/teenage` has a real package manifest. Every other workspace package is private and exports its TypeScript source, and [tsdown](https://tsdown.dev) bundles them all into `@ulnd/teenage`. The build fails if the output imports anything but React, and only the `/react` entry may import React. The smoke test loads the build in plain Node and checks both rules.

A device package is mostly data. It declares its controls and their kinds (`slider`, `knob`, `button` or relative `encoder`), maps controller numbers to them with `defineDevice()`, and subclasses `TEDevice`. The shared core derives the decoders, binding resolution and typed events from that map.

To add a device:
1. Copy `packages/tp-7` and `sites/tp-7`, then change the map and the drawing.
2. Export the device from `packages/teenage/src/index.ts`.
3. Register it in `SITES` (`sites/te-site-kit/src/sites.ts`), and add it to the `paths` in both tsconfigs.

## Development
This is a Bun workspace.

```
bun install
bun run check          # lint, typecheck, test, build, and a smoke test of the build in plain Node
bun run pack           # build @ulnd/teenage into packed/*.tgz, as it'd be published
bun run site:tx-6      # dev server for one site (tp-7 and op-1 likewise); the nav links between them locally
bun run sites:build    # build all three sites
```

Tests, type checks and the sites all build against the packages' source, so there's no build step during development. The sites import only `@ulnd/teenage`, like any other consumer.

### Releasing
Bump `version` in `packages/teenage/package.json`, then push a matching `v<version>` tag. The [release workflow](.github/workflows/release.yml) checks, packs and publishes `@ulnd/teenage` to npm with provenance.

The workflow publishes with npm [trusted publishing](https://docs.npmjs.com/trusted-publishers) once that's configured for the package, and otherwise with an `NPM_TOKEN` repository secret. Trusted publishing can only be set up for a package that already exists, so the first release needs the token (or a manual `npm publish packed/<file>.tgz --access public`).

## Sites
Each site draws its device with every control live, shows a raw log of every BLE-MIDI packet and the messages parsed from it, and has a **pair controls** mode: click a control on the drawing, then move it on the device to pair them. Pairings are saved in the browser, per device.

Each site is a static-assets [Cloudflare Worker](https://developers.cloudflare.com/workers/static-assets/), served on its own custom domain (`<device>.jake.kitchen`). The TP-7 and OP-1 Workers are configured in `sites/<device>/wrangler.jsonc`. The TX-6 Worker's config stays in the root `wrangler.jsonc`, where its existing Workers Builds project expects it.

```
bun run sites:deploy                            # build and deploy all three
bun run --cwd sites/op-1 deploy                 # or just one
bun run --cwd sites/op-1 deploy:dry-run         # check the config without deploying
```

`wrangler deploy` runs the site's build itself. To connect the TP-7 or OP-1 Worker to Cloudflare Workers Builds, set its root directory to `sites/<device>`.

## Thanks
Inspired by [this demo](https://twitter.com/hturan/status/1523702486258782208) by [@hturan@twitter.com](https://twitter.com/hturan).

## License
MIT
