import { TP7, type TP7ControlKinds } from '@ulnd/tp-7'
import { webBluetooth } from '@ulnd/tp-7/web-bluetooth'
import { createDeviceHooks, type DeviceHooks } from '@ulnd/use-te-device'

export type { Connection, DeviceHooks } from '@ulnd/use-te-device'

const hooks: DeviceHooks<TP7ControlKinds, TP7> = createDeviceHooks(() => new TP7({ transport: webBluetooth() }))

/** The TP-7 used by the hooks when there's no {@link TP7Provider} above them. Connects over Web Bluetooth. */
export const getDefaultTP7: typeof hooks.getDefault = hooks.getDefault
/** Provide a specific {@link TP7} instance (with any transport) to the hooks below. */
export const TP7Provider: typeof hooks.Provider = hooks.Provider
/** The {@link TP7} instance the hooks are bound to. */
export const useTP7Device: typeof hooks.useDevice = hooks.useDevice
/** Connection state and controls for the TP-7. */
export const useTP7: typeof hooks.useConnection = hooks.useConnection
/** Latest parameters for one control; `{}` until it first moves. */
export const useTP7Attribute: typeof hooks.useAttribute = hooks.useAttribute
/** Latest parameters for several controls at once, in the order given. */
export const useTP7Attributes: typeof hooks.useAttributes = hooks.useAttributes

export default useTP7
