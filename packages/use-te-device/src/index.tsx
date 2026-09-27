import type { ConnectionState, ControlKinds, ControlName, ControlParameters, TEDeviceEvents } from '@ulnd/te-device'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useSyncExternalStore } from 'react'

/**
 * Any device these hooks can drive: a `TX6`, `TP7`, `OP1`, or your own
 * `TEDevice`. Structural, so the hooks don't depend on any device package.
 */
export interface AnyDevice {
	/** Type-only: the device's controls and their kinds. */
	readonly '~controls': ControlKinds
	readonly profile: { readonly name: string }
	readonly state: ConnectionState
	subscribe(listener: () => void): () => void
	getValue(control: string): unknown
	// biome-ignore lint/suspicious/noExplicitAny: every device's listeners take different arguments
	on(event: string, listener: (...args: any[]) => void): () => void
	connect(): Promise<void>
	disconnect(): Promise<void>
}

/**
 * Augment to type the hooks for the device your app uses, so context-based
 * calls need no type argument:
 *
 * ```ts
 * declare module '@ulnd/use-te-device' {
 *   interface Register { device: TX6 }
 * }
 * ```
 */
// biome-ignore lint/suspicious/noEmptyInterface: an extension point for declaration merging
export interface Register {}

/** The device type hooks assume when none is given: the registered device, or any device. */
export type DefaultDevice = Register extends { device: infer D extends AnyDevice } ? D : AnyDevice

/** A device's controls and their kinds. */
export type KindsOf<D> = D extends { readonly '~controls': infer K extends ControlKinds } ? K : ControlKinds

/** Every control name a device has. */
export type ControlOf<D> = ControlName<KindsOf<D>>

/** Every event a device emits: its controls, plus `event`, `message`, `status` and the rest. */
export type EventOf<D> = keyof TEDeviceEvents<KindsOf<D>> & string

type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (value: infer I) => void ? I : never

type ParametersOf<D, C> = C extends ControlOf<D> ? ControlParameters<KindsOf<D>, C> : never

/**
 * A control's latest payload, with every field optional until it first moves.
 * When the control isn't known precisely (e.g. `useControl<TX6>(name)`), the
 * payloads of every kind it could be are merged, so all their fields are available.
 */
export type ControlValue<D, C> = Partial<UnionToIntersection<ParametersOf<D, C>>>

export interface Connection<D> {
	device: D
	status: ConnectionState['status']
	error: Error | undefined
	connect(): Promise<void>
	disconnect(): Promise<void>
}

const Context = createContext<AnyDevice | null>(null)

const EMPTY = Object.freeze({}) as never

/** Provide a device to the hooks below. Any device works: `<DeviceProvider device={new TX6()}>`. */
export function DeviceProvider({ device, children }: { device: AnyDevice, children?: ReactNode }) {
	return <Context.Provider value={device}>{children}</Context.Provider>
}

/**
 * The device the hooks drive: `device` if you pass one, or else the nearest
 * {@link DeviceProvider}'s. Throws if there's neither.
 */
export function useDevice<D extends AnyDevice = DefaultDevice>(device?: D): D {
	const provided = useContext(Context)
	const resolved = device ?? provided
	if(!resolved)
		throw new Error('No device: pass one to the hook, or render a <DeviceProvider device={…}> above it')

	return resolved as D
}

/** Connection state, and functions to connect and disconnect. */
export function useConnection<D extends AnyDevice = DefaultDevice>(device?: D): Connection<D> {
	const resolved = useDevice(device)
	const { status, error } = useSyncExternalStore(
		resolved.subscribe,
		() => resolved.state,
		() => resolved.state
	)

	// Failures are surfaced through `error`, so don't leave rejections unhandled
	const connect = useCallback(() => resolved.connect().catch(() => {}), [resolved])
	const disconnect = useCallback(() => resolved.disconnect(), [resolved])

	return { device: resolved, status, error: error as Error | undefined, connect, disconnect }
}

/**
 * Latest payload for one control; `{}` until it first moves. Typed exactly when
 * you pass the device (`useControl('input1.slider', tx6)`); with a type argument
 * instead (`useControl<TX6>('input1.slider')`) the name is checked and every field
 * the control could have is available.
 */
export function useControl<D extends AnyDevice = DefaultDevice, const C extends ControlOf<D> = ControlOf<D>>(control: C, device?: D): ControlValue<D, C> {
	const resolved = useDevice(device)
	const value = useSyncExternalStore(
		resolved.subscribe,
		() => resolved.getValue(control),
		() => resolved.getValue(control)
	)

	return (value ?? EMPTY) as ControlValue<D, C>
}

/**
 * Latest payloads for several controls at once, in the order given. Pass the
 * device for a typed tuple (`useControls(['fx1', 'fx2'], tx6)`); with a type
 * argument instead, the result is an array of every field the controls could have.
 */
export function useControls<D extends AnyDevice = DefaultDevice, const C extends readonly ControlOf<D>[] = readonly ControlOf<D>[]>(controls: C, device?: D): { [I in keyof C]: ControlValue<D, C[I]> } {
	const resolved = useDevice(device)
	const cache = useRef<unknown[]>([])

	const getSnapshot = () => {
		const next = controls.map(control => resolved.getValue(control) ?? EMPTY)
		const previous = cache.current
		// Return a stable array while nothing has changed, as useSyncExternalStore requires
		if(next.length !== previous.length || next.some((value, index) => value !== previous[index]))
			cache.current = next

		return cache.current
	}

	return useSyncExternalStore(resolved.subscribe, getSnapshot, getSnapshot) as never
}

/**
 * Listen for a device event while the component is mounted: a control
 * (`'select.encoder'`), or `'event'`, `'message'`, `'status'` and the rest.
 * Useful for encoders, which report turns rather than a position. Pass the
 * device for a typed listener.
 */
export function useDeviceEvent<D extends AnyDevice = DefaultDevice, const N extends EventOf<D> = EventOf<D>>(
	event: N,
	listener: (...args: TEDeviceEvents<KindsOf<D>>[N]) => void,
	device?: D
) {
	const resolved = useDevice(device)
	const current = useRef(listener)
	current.current = listener

	useEffect(() => resolved.on(event, (...args) => (current.current as (...args: unknown[]) => void)(...args)), [resolved, event])
}
