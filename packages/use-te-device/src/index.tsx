import type { ConnectionState, ControlKinds, ControlName, ControlParameters } from '@ulnd/te-device'
import { createContext, type ReactNode, useCallback, useContext, useRef, useSyncExternalStore } from 'react'

/**
 * What the hooks need from a device. Structural, so the hooks work with any
 * device package's class without depending on its exact declaration.
 */
export interface HookableDevice<K extends ControlKinds> {
	readonly state: ConnectionState
	subscribe(listener: () => void): () => void
	getValue<C extends ControlName<K>>(event: C): ControlParameters<K, C> | undefined
	connect(): Promise<void>
	disconnect(): Promise<void>
}

export interface Connection<D> {
	device: D
	status: ConnectionState['status']
	error: Error | undefined
	connect(): Promise<void>
	disconnect(): Promise<void>
}

export interface DeviceHooks<K extends ControlKinds, D extends HookableDevice<K>> {
	/** The device used by the hooks when there's no {@link DeviceHooks.Provider} above them. */
	getDefault(): D
	/** Provide a specific device instance (with any transport) to the hooks below. */
	Provider(props: { device: D, children?: ReactNode }): ReactNode
	/** The device instance the hooks are bound to. */
	useDevice(): D
	/** Connection state, and functions to connect and disconnect. */
	useConnection(): Connection<D>
	/** Latest parameters for one control; `{}` until it first moves. */
	useAttribute<C extends ControlName<K>>(event: C): Partial<ControlParameters<K, C>>
	/** Latest parameters for several controls at once, in the order given. */
	useAttributes<const C extends readonly ControlName<K>[]>(events: C): { [I in keyof C]: Partial<ControlParameters<K, C[I]>> }
}

const EMPTY = Object.freeze({}) as never

/**
 * Build the React hooks for one device. `createDefault` is called lazily, the
 * first time a hook runs without a Provider above it.
 */
export function createDeviceHooks<K extends ControlKinds, D extends HookableDevice<K>>(createDefault: () => D): DeviceHooks<K, D> {
	let defaultDevice: D | undefined
	const getDefault = () => {
		defaultDevice ??= createDefault()
		return defaultDevice
	}

	const Context = createContext<D | null>(null)

	const Provider = ({ device, children }: { device: D, children?: ReactNode }) => <Context.Provider value={device}>{children}</Context.Provider>

	const useDevice = () => useContext(Context) ?? getDefault()

	const useConnection = (): Connection<D> => {
		const device = useDevice()
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

	const useAttribute = <C extends ControlName<K>>(event: C): Partial<ControlParameters<K, C>> => {
		const device = useDevice()
		const value = useSyncExternalStore(
			device.subscribe,
			() => device.getValue(event),
			() => device.getValue(event)
		)

		return value ?? EMPTY
	}

	const useAttributes = <const C extends readonly ControlName<K>[]>(events: C) => {
		const device = useDevice()
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

	return { getDefault, Provider, useDevice, useConnection, useAttribute, useAttributes }
}
