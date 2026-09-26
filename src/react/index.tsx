import { createContext, type ReactNode, useCallback, useContext, useRef, useSyncExternalStore } from 'react'

import type { TX6EventParameters, TX6EventType } from '../controls.js'
import { webBluetooth } from '../transports/web-bluetooth.js'
import { TX6 } from '../tx6.js'

let defaultDevice: TX6 | undefined

/** The TX-6 used by the hooks when there's no {@link TX6Provider} above them. */
export function getDefaultTX6() {
	defaultDevice ??= new TX6({ transport: webBluetooth() })
	return defaultDevice
}

const TX6Context = createContext<TX6 | null>(null)

/** Provide a specific {@link TX6} instance (with any transport) to the hooks below. */
export function TX6Provider({ device, children }: { device: TX6, children?: ReactNode }) {
	return <TX6Context.Provider value={device}>{children}</TX6Context.Provider>
}

/** The {@link TX6} instance the hooks are bound to. */
export function useTX6Device() {
	return useContext(TX6Context) ?? getDefaultTX6()
}

/** Connection state and controls for the TX-6. */
export function useTX6() {
	const device = useTX6Device()
	const { status, error } = useSyncExternalStore(
		device.subscribe,
		() => device.state,
		() => device.state
	)

	// Failures are surfaced through `error`, so don't leave rejections unhandled
	const connect = useCallback(() => device.connect().catch(() => {}), [device])
	const disconnect = useCallback(() => device.disconnect(), [device])

	return { device, status, error: error as Error | undefined, connect, disconnect }
}

/** Latest parameters for one control; `{}` until it first moves. */
export function useTX6Attribute<E extends TX6EventType>(event: E): Partial<TX6EventParameters<E>> {
	const device = useTX6Device()
	const value = useSyncExternalStore(
		device.subscribe,
		() => device.getValue(event),
		() => device.getValue(event)
	)

	return value ?? EMPTY
}

/** Latest parameters for several controls at once, in the order given. */
export function useTX6Attributes<const E extends readonly TX6EventType[]>(events: E): { [I in keyof E]: Partial<TX6EventParameters<E[I]>> } {
	const device = useTX6Device()
	const cache = useRef<unknown[]>([])

	const getSnapshot = () => {
		const next = events.map(event => device.getValue(event) ?? EMPTY)
		const previous = cache.current
		// Return a stable array while nothing has changed, as useSyncExternalStore requires
		if(next.length !== previous.length || next.some((value, index) => value !== previous[index]))
			cache.current = next

		return cache.current
	}

	return useSyncExternalStore(device.subscribe, getSnapshot, getSnapshot) as never
}

const EMPTY = Object.freeze({}) as never

export default useTX6
