import { OP1, type OP1ControlKinds } from '@ulnd/op-1'
import { webBluetooth } from '@ulnd/op-1/web-bluetooth'
import { createDeviceHooks, type DeviceHooks } from '@ulnd/use-te-device'

export type { Connection, DeviceHooks } from '@ulnd/use-te-device'

const hooks: DeviceHooks<OP1ControlKinds, OP1> = createDeviceHooks(() => new OP1({ transport: webBluetooth() }))

/** The OP-1 field used by the hooks when there's no {@link OP1Provider} above them. Connects over Web Bluetooth. */
export const getDefaultOP1: typeof hooks.getDefault = hooks.getDefault
/** Provide a specific {@link OP1} instance (with any transport) to the hooks below. */
export const OP1Provider: typeof hooks.Provider = hooks.Provider
/** The {@link OP1} instance the hooks are bound to. */
export const useOP1Device: typeof hooks.useDevice = hooks.useDevice
/** Connection state and controls for the OP-1 field. */
export const useOP1: typeof hooks.useConnection = hooks.useConnection
/** Latest parameters for one control; `{}` until it first moves. */
export const useOP1Attribute: typeof hooks.useAttribute = hooks.useAttribute
/** Latest parameters for several controls at once, in the order given. */
export const useOP1Attributes: typeof hooks.useAttributes = hooks.useAttributes

export default useOP1
