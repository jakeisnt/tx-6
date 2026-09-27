# teenage engineering over MIDI
Drive teenage engineering devices from JavaScript: the **TX-6** mixer, the **TP-7** field recorder and the **OP-1 field** synthesizer. Each device has two packages, a headless driver and React hooks, plus a browser remote of its own.

| device | headless | React | site |
| --- | --- | --- | --- |
| TX-6 | [`@ulnd/tx-6`](packages/tx-6/core) | [`@ulnd/use-tx-6`](packages/tx-6/react) | [tx-6.jake.kitchen](https://tx-6.jake.kitchen) |
| TP-7 | [`@ulnd/tp-7`](packages/tp-7/core) | [`@ulnd/use-tp-7`](packages/tp-7/react) | [tp-7.jake.kitchen](https://tp-7.jake.kitchen) |
| OP-1 field | [`@ulnd/op-1`](packages/op-1/core) | [`@ulnd/use-op-1`](packages/op-1/react) | [op-1.jake.kitchen](https://op-1.jake.kitchen) |

The headless packages decode a device's controls in any JavaScript runtime (browsers, Node, Bun, Deno, workers), with no DOM or React. They ship Web Bluetooth and Web MIDI transports and accept any transport you write. The React packages wrap them in hooks.

```
npm install @ulnd/tx-6                  # headless
npm install @ulnd/tx-6 @ulnd/use-tx-6   # React
```

```ts
import { TX6 } from '@ulnd/tx-6'
import { webMidi } from '@ulnd/tx-6/web-midi'

const tx6 = new TX6({ transport: webMidi() })
tx6.on('input1.slider', ({ progress }) => console.log('fader 1', progress))
await tx6.connect()
```

Every device has the same API. Swap `TX6` for `TP7` or `OP1`, and `useTX6…` for `useTP7…` or `useOP1…`. Each package README covers its device's setup and controls, and each device has a MIDI reference: [TX-6](docs/tx-6-midi.md), [TP-7](docs/tp-7-midi.md), [OP-1 field](docs/op-1-midi.md).

> **Only the TX-6 map is verified on hardware.** The TP-7 and OP-1 field maps are best-effort guesses, and every unconfirmed number is marked in the code and docs. Until they're confirmed, pair controls with `device.bind(source, control)` or use pairing mode on the sites. Corrections are welcome.

## References

- AI slop app that we can beat: https://tswitcher.app/
- TP-7 MIDI mapping that we can reverse-engineer: https://lucidyan.github.io/tp7-midi/, via https://github.com/lucidyan/tp7-midi
- `use-tx-6`: original framework that jump-started this. https://github.com/darnfish/use-tx-6
- Other resources: https://github.com/bnjreece/awesome-te?utm_source=chatgpt.com

## How it fits together
```
packages/
  te-device/      private   shared core: MIDI and BLE-MIDI parsing, transports,
                            the connection state machine, pairing, defineDevice()
  use-te-device/  private   shared React hook factory: createDeviceHooks()
  tx-6/core       @ulnd/tx-6       ─┐
  tx-6/react      @ulnd/use-tx-6    │ per device: a control map and names;
  tp-7/core       @ulnd/tp-7        │ everything else comes from the shared cores
  tp-7/react      @ulnd/use-tp-7    │
  op-1/core       @ulnd/op-1        │
  op-1/react      @ulnd/use-op-1   ─┘
sites/
  te-site-kit/    private   shared site UI: toolbar, cross-site nav, MIDI log,
                            pairing, generic dials and keys, Vite config
  tx-6/ tp-7/ op-1/         one Vite app and Cloudflare Worker per device
```

A device package is mostly data. It declares its controls and their kinds (`slider`, `knob`, `button` or relative `encoder`), maps controller numbers to them with `defineDevice()`, and subclasses `TEDevice`. The shared core derives the decoders, binding resolution and typed events from that map. To add a device, copy `packages/tp-7` and `sites/tp-7`, and change the map and the drawing. Then register the device in `SITES` (`sites/te-site-kit/src/sites.ts`), the `paths` in both tsconfigs, and the root `package.json` scripts.

`@ulnd/te-device` and `@ulnd/use-te-device` are never published. Each device package bundles them in at build time with [tsdown](https://tsdown.dev), so every published package installs on its own. The build fails if a package's output imports anything other than React or its own core package. The smoke test checks that no published file references a private package.

## Development
This is a Bun workspace.

```
bun install
bun run check          # lint, typecheck, test, build, and a smoke test of the builds in plain Node
bun run pack           # build all six packages into packed/*.tgz, as they'd be published
bun run site:tx-6      # dev server for one site (tp-7 and op-1 likewise); the nav links between them locally
bun run sites:build    # build all three sites
```

Tests, type checks and the sites all build against the packages' source, so there's no build step during development.

### Releasing
Bump `version` in all six `packages/*/{core,react}/package.json` and keep them in step, since each React package peers on `^` its core package at the same version. Then push a `v<version>` tag. The [release workflow](.github/workflows/release.yml) checks, packs and publishes all six packages to npm with provenance. Each core package goes out before its React package.

The workflow publishes with npm [trusted publishing](https://docs.npmjs.com/trusted-publishers) when that's configured for every package, and otherwise with an `NPM_TOKEN` repository secret. Trusted publishing can only be set up for a package that already exists, so the first release needs the token (or a manual `npm publish packed/<file>.tgz --access public`).

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
