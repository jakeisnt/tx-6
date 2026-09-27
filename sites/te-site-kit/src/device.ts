import type { ControlKinds, TEDevice } from '@ulnd/teenage'
import { useDevice as useAnyDevice } from '@ulnd/teenage/react'

/** Any teenage engineering device, with its full profile. The kit's components work with every one. */
export type AnyDevice = TEDevice<ControlKinds>

/** The site's device, from the {@link DeviceSite}'s provider. */
export const useDevice = (): AnyDevice => useAnyDevice<AnyDevice>()

export { useConnection, useControl, useDeviceEvent } from '@ulnd/teenage/react'
