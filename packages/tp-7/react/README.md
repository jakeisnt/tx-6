# @ulnd/use-tp-7
React hooks for the teenage engineering TP-7, built on the headless [`@ulnd/tp-7`](https://www.npmjs.com/package/@ulnd/tp-7) driver.

```
npm install @ulnd/tp-7 @ulnd/use-tp-7
```

```tsx
import useTP7, { useTP7Attribute } from '@ulnd/use-tp-7'

export default function App() {
  const { connect, status } = useTP7()
  const { pressed } = useTP7Attribute('play')

  if(status !== 'connected')
    return <button onClick={connect}>connect to TP-7</button>

  return <span>play is {pressed ? 'down' : 'up'}</span>
}
```

| hook | returns |
| --- | --- |
| `useTP7()` | `{ device, status, error, connect, disconnect }` |
| `useTP7Attribute(control)` | the control's latest payload, or `{}` until it first moves |
| `useTP7Attributes([controls])` | several payloads at once, in the order given |
| `useTP7Device()` | the `TP7` instance the hooks are bound to |

The hooks connect over Web Bluetooth by default. To use another transport, or to share a device with non-React code, wrap your app in `<TP7Provider device={new TP7({ transport })}>`.

Relative encoders such as `reel` report each turn, not a position, so listen for them with `useTP7Device().on('reel', ({ delta }) => …)` in an effect.

For setup and the control map, see [`@ulnd/tp-7`](https://www.npmjs.com/package/@ulnd/tp-7).

## License
MIT
