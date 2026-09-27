# @ulnd/use-tx-6
React hooks for the teenage engineering TX-6, built on the headless [`@ulnd/tx-6`](https://www.npmjs.com/package/@ulnd/tx-6) driver.

```
npm install @ulnd/tx-6 @ulnd/use-tx-6
```

```tsx
import useTX6, { useTX6Attribute } from '@ulnd/use-tx-6'

export default function App() {
  const { connect, status } = useTX6()
  const { progress = 0 } = useTX6Attribute('input1.slider')

  if(status !== 'connected')
    return <button onClick={connect}>connect to TX-6</button>

  return <span style={{ fontSize: `${progress * 100}px` }}>connected to TX-6</span>
}
```

The hooks connect over Web Bluetooth by default. Wrap your app in `<TX6Provider device={new TX6({ transport })}>` to use another transport.

The TX-6 must have **ctrl out** turned on. For setup, the headless API and the full MIDI reference, see the [repository](https://github.com/jakeisnt/tx-6#readme).

## License
MIT
