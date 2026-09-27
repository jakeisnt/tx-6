import type { ControlKinds, TEDevice } from '@ulnd/te-device'
import { createDeviceHooks } from '@ulnd/use-te-device'

/** Any teenage engineering device. The kit's components work with every one. */
export type AnyDevice = TEDevice<ControlKinds>

const hooks = createDeviceHooks<ControlKinds, AnyDevice>(() => {
	throw new Error('Render the kit components inside <DeviceSite>')
})

export const DeviceProvider = hooks.Provider
export const useDevice = hooks.useDevice
export const useConnection = hooks.useConnection
export const useControl = hooks.useAttribute
