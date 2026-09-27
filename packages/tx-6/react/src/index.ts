import { TX6, type TX6ControlKinds } from '@ulnd/tx-6'
import { webBluetooth } from '@ulnd/tx-6/web-bluetooth'
import { createDeviceHooks, type DeviceHooks } from '@ulnd/use-te-device'

export type { Connection, DeviceHooks } from '@ulnd/use-te-device'

const hooks: DeviceHooks<TX6ControlKinds, TX6> = createDeviceHooks(() => new TX6({ transport: webBluetooth() }))

/** The TX-6 used by the hooks when there's no {@link TX6Provider} above them. Connects over Web Bluetooth. */
export const getDefaultTX6: typeof hooks.getDefault = hooks.getDefault
/** Provide a specific {@link TX6} instance (with any transport) to the hooks below. */
export const TX6Provider: typeof hooks.Provider = hooks.Provider
/** The {@link TX6} instance the hooks are bound to. */
export const useTX6Device: typeof hooks.useDevice = hooks.useDevice
/** Connection state and controls for the TX-6. */
export const useTX6: typeof hooks.useConnection = hooks.useConnection
/** Latest parameters for one control; `{}` until it first moves. */
export const useTX6Attribute: typeof hooks.useAttribute = hooks.useAttribute
/** Latest parameters for several controls at once, in the order given. */
export const useTX6Attributes: typeof hooks.useAttributes = hooks.useAttributes

export default useTX6
