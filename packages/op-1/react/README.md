# @ulnd/use-op-1
React hooks for the teenage engineering OP-1 field, built on the headless [`@ulnd/op-1`](https://www.npmjs.com/package/@ulnd/op-1) driver.

```
npm install @ulnd/op-1 @ulnd/use-op-1
```

```tsx
import useOP1, { useOP1Attribute } from '@ulnd/use-op-1'

export default function App() {
  const { connect, status } = useOP1()
  const { pressed } = useOP1Attribute('play')

  if(status !== 'connected')
    return <button onClick={connect}>connect to OP-1 field</button>

  return <span>play is {pressed ? 'down' : 'up'}</span>
}
```

| hook | returns |
| --- | --- |
| `useOP1()` | `{ device, status, error, connect, disconnect }` |
| `useOP1Attribute(control)` | the control's latest payload, or `{}` until it first moves |
| `useOP1Attributes([controls])` | several payloads at once, in the order given |
| `useOP1Device()` | the `OP1` instance the hooks are bound to |

The hooks connect over Web Bluetooth by default. To use another transport, or to share a device with non-React code, wrap your app in `<OP1Provider device={new OP1({ transport })}>`.

Relative encoders such as `blue.encoder` report each turn, not a position, so listen for them with `useOP1Device().on('blue.encoder', ({ delta }) => …)` in an effect.

For setup and the control map, see [`@ulnd/op-1`](https://www.npmjs.com/package/@ulnd/op-1).

## License
MIT
