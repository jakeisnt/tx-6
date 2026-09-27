import {
	type ControlBindings,
	type ControlEvent,
	type ControlKinds,
	type ControlName,
	type ControlParameters,
	type ControlSource,
	toSource
} from './controls.js'
import { Emitter } from './emitter.js'
import { asControlInput, type MidiMessage, toMidiMessage } from './midi.js'
import type { DeviceProfile } from './profile.js'
import type { TEDeviceTransport, TEDeviceTransportSink } from './transport.js'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export interface TEDeviceOptions<K extends ControlKinds> {
	/** Transport used by {@link TEDevice.connect} when none is passed explicitly. */
	transport?: TEDeviceTransport
	/** Only accept messages on this MIDI channel (0–15). Defaults to any channel. */
	channel?: number
	/** Custom pairings of MIDI sources to controls, applied over the default map. */
	bindings?: ControlBindings<ControlName<K>>
}

/** Where a message came from: the connected transport, or {@link TEDevice.receive}. */
export type MessageOrigin = 'device' | 'local'

/** What the device made of a received message. */
export interface MessageInfo<K extends ControlKinds> {
	origin: MessageOrigin
	/** The CC or note the message came from, if it was one. */
	source?: ControlSource
	/** The control event it decoded to, if any. */
	event?: ControlEvent<K>
}

export interface ConnectionState {
	status: ConnectionStatus
	error: unknown
}

export type TEDeviceEvents<K extends ControlKinds> =
	& { [C in ControlName<K>]: [parameters: ControlParameters<K, C>] }
	& {
		/** Any decoded control event. */
		event: [event: ControlEvent<K>]
		/** Every MIDI message received, including ones that aren't controls. */
		message: [message: MidiMessage, info: MessageInfo<K>]
		/** Raw bytes from the transport before parsing, e.g. one BLE-MIDI packet. */
		packet: [bytes: Uint8Array]
		/** Custom pairings changed. */
		bindings: [bindings: ControlBindings<ControlName<K>>]
		status: [status: ConnectionStatus]
		error: [error: unknown]
		/** Fired after any change to connection state or control values. */
		change: []
	}

/**
 * A teenage engineering device that sends its controls as MIDI. Platform-agnostic:
 * bring a {@link TEDeviceTransport} for the environment you're in, or feed MIDI
 * in yourself with {@link TEDevice.receive}. Each device package subclasses this
 * with its own {@link DeviceProfile}.
 */
export class TEDevice<K extends ControlKinds> {
	/** The device this instance drives: its name and control map. */
	readonly profile: DeviceProfile<K>
	/**
	 * Type-only, never set at runtime: the device's controls and their kinds, so
	 * code that receives any device (such as the React hooks) can infer them.
	 */
	declare readonly '~controls': K
	// Loosely typed inside: for a generic device, TypeScript can't rule out a control
	// named like a built-in event. defineDevice() rejects those at runtime.
	readonly #emitter = new Emitter<Record<string, unknown[]>>()
	readonly #values = new Map<string, unknown>()
	readonly #channel: number | undefined
	#bindings: ControlBindings<ControlName<K>>
	#defaultTransport: TEDeviceTransport | undefined

	#state: ConnectionState = { status: 'disconnected', error: undefined }
	#transport: TEDeviceTransport | undefined
	#connecting: Promise<void> | undefined
	/** Bumped on every connect/disconnect so stale transport callbacks are ignored. */
	#generation = 0

	constructor(profile: DeviceProfile<K>, options: TEDeviceOptions<K> = {}) {
		this.profile = profile
		this.#defaultTransport = options.transport
		this.#channel = options.channel
		this.#bindings = Object.freeze({ ...options.bindings })
	}

	/** Custom pairings, applied over the default map. A new object whenever it changes. */
	get bindings(): ControlBindings<ControlName<K>> {
		return this.#bindings
	}

	/** The control a source currently decodes to, if any. */
	resolve(source: ControlSource): ControlName<K> | undefined {
		return this.profile.resolveBinding(source, this.#bindings)
	}

	/**
	 * Pair a source with a control, replacing whatever it mapped to. Any other
	 * source bound to the same control keeps working, so pairing is additive.
	 * Pass `null` to ignore the source entirely.
	 */
	bind(source: ControlSource, event: ControlName<K> | null) {
		this.setBindings({ ...this.#bindings, [source]: event })
	}

	/** Drop a custom pairing so the source falls back to the default map. */
	unbind(source: ControlSource) {
		if(!Object.hasOwn(this.#bindings, source))
			return

		const { [source]: _, ...rest } = this.#bindings
		this.setBindings(rest)
	}

	/** Replace every custom pairing at once; pass `{}` to restore the defaults. */
	setBindings(bindings: ControlBindings<ControlName<K>>) {
		this.#bindings = Object.freeze({ ...bindings })
		this.#emitter.emit('bindings', this.#bindings)
		this.#emitter.emit('change')
	}

	get status() {
		return this.#state.status
	}

	get error() {
		return this.#state.error
	}

	/** Immutable snapshot of connection state; a new object whenever it changes. */
	get state(): ConnectionState {
		return this.#state
	}

	/** Last value received for a control, or `undefined` if it hasn't moved yet. */
	getValue<C extends ControlName<K>>(event: C): ControlParameters<K, C> | undefined {
		return this.#values.get(event) as ControlParameters<K, C> | undefined
	}

	on<N extends keyof TEDeviceEvents<K>>(event: N, listener: (...args: TEDeviceEvents<K>[N]) => void) {
		return this.#emitter.on(event as string, listener as (...args: unknown[]) => void)
	}

	off<N extends keyof TEDeviceEvents<K>>(event: N, listener: (...args: TEDeviceEvents<K>[N]) => void) {
		this.#emitter.off(event as string, listener as (...args: unknown[]) => void)
	}

	/**
	 * Subscribe to any change; returns an unsubscribe function. Bound to the
	 * instance, so it can be passed around directly (e.g. to useSyncExternalStore).
	 */
	readonly subscribe = (listener: () => void) => this.#emitter.on('change', listener)

	/**
	 * Connect through `transport` (or the one given to the constructor).
	 * Resolves once connected; rejects, and records {@link TEDevice.error}, on failure.
	 */
	connect(transport: TEDeviceTransport | undefined = this.#defaultTransport): Promise<void> {
		if(this.#connecting)
			return this.#connecting
		if(this.#state.status === 'connected')
			return Promise.resolve()
		if(!transport)
			return Promise.reject(new Error(`No transport provided to connect to the ${this.profile.name}`))

		this.#defaultTransport ??= transport

		const generation = ++this.#generation
		const isCurrent = () => generation === this.#generation

		const sink: TEDeviceTransportSink = {
			message: message => {
				if(isCurrent())
					this.#receive(message, 'device')
			},
			packet: bytes => {
				if(isCurrent())
					this.#emitter.emit('packet', bytes)
			},
			disconnected: error => {
				if(!isCurrent())
					return

				this.#generation++
				this.#transport = undefined
				this.#connecting = undefined
				this.#setState('disconnected', error)
			}
		}

		this.#transport = transport
		this.#setState('connecting', undefined)

		const attempt = (async () => {
			try {
				await transport.connect(sink)
			} catch(error) {
				if(isCurrent()) {
					this.#generation++
					this.#transport = undefined
					this.#setState('disconnected', error)
				}

				throw error
			}

			if(!isCurrent()) {
				// disconnect() was called while we were still connecting
				await transport.disconnect()
				throw new Error(`Connection to the ${this.profile.name} was cancelled`)
			}

			this.#setState('connected', undefined)
		})()

		this.#connecting = attempt

		const settle = () => {
			if(this.#connecting === attempt)
				this.#connecting = undefined
		}
		attempt.then(settle, settle)

		return attempt
	}

	/** Disconnect from the device. Safe to call at any time. */
	async disconnect() {
		const transport = this.#transport
		if(!transport)
			return

		this.#generation++
		this.#transport = undefined
		this.#connecting = undefined
		this.#setState('disconnected', undefined)

		await transport.disconnect()
	}

	/**
	 * Feed a raw MIDI message in. Transports call this for you, but it's also
	 * handy for tests, recordings, or wiring up a MIDI source by hand.
	 */
	receive(input: MidiMessage | ArrayLike<number>) {
		this.#receive(input, 'local')
	}

	#receive(input: MidiMessage | ArrayLike<number>, origin: MessageOrigin) {
		const message = 'status' in input ? input : toMidiMessage(input)
		if(!message)
			return

		const control = asControlInput(message)
		const source = control && toSource(control)
		const accepted = control && (this.#channel === undefined || control.channel === this.#channel)
		const target = accepted ? this.resolve(source!) : undefined
		const decoded = target && this.profile.decodeControlValue(target, control!.value)

		this.#emitter.emit('message', message, { origin, source, event: decoded })

		if(!decoded)
			return

		const { event, ...parameters } = decoded
		this.#values.set(event, parameters)

		this.#emitter.emit(event, parameters)
		this.#emitter.emit('event', decoded)
		this.#emitter.emit('change')
	}

	/** Forget all last-known control values. */
	reset() {
		this.#values.clear()
		this.#emitter.emit('change')
	}

	/** Disconnect and remove every listener. */
	async dispose() {
		await this.disconnect()
		this.#emitter.clear()
	}

	#setState(status: ConnectionStatus, error: unknown) {
		const previous = this.#state
		if(previous.status === status && previous.error === error)
			return

		this.#state = { status, error }

		if(error !== undefined && error !== previous.error)
			this.#emitter.emit('error', error)
		if(status !== previous.status)
			this.#emitter.emit('status', status)

		this.#emitter.emit('change')
	}
}
