import {
	decodeControlValue,
	resolveBinding,
	type TX6Bindings,
	type TX6Event,
	type TX6EventParameters,
	type TX6EventType,
	type TX6Source, 
	toSource
} from './controls.js'
import { Emitter } from './emitter.js'
import { asControlInput, type MidiMessage, toMidiMessage } from './midi.js'
import type { TX6Transport, TX6TransportSink } from './transport.js'

export type TX6ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export interface TX6Options {
	/** Transport used by {@link TX6.connect} when none is passed explicitly. */
	transport?: TX6Transport
	/** Only accept messages on this MIDI channel (0–15). Defaults to any channel. */
	channel?: number
	/** Custom pairings of MIDI sources to controls, applied over the default map. */
	bindings?: TX6Bindings
}

/** Where a message came from: the connected transport, or {@link TX6.receive}. */
export type TX6MessageOrigin = 'device' | 'local'

/** What the TX6 made of a received message. */
export interface TX6MessageInfo {
	origin: TX6MessageOrigin
	/** The CC or note the message came from, if it was one. */
	source?: TX6Source
	/** The control event it decoded to, if any. */
	event?: TX6Event
}

export interface TX6ConnectionState {
	status: TX6ConnectionStatus
	error: unknown
}

export type TX6Events =
	& { [E in TX6EventType]: [parameters: TX6EventParameters<E>] }
	& {
		/** Any decoded control event. */
		event: [event: TX6Event]
		/** Every MIDI message received, including ones that aren't TX-6 controls. */
		message: [message: MidiMessage, info: TX6MessageInfo]
		/** Raw bytes from the transport before parsing, e.g. one BLE-MIDI packet. */
		packet: [bytes: Uint8Array]
		/** Custom pairings changed. */
		bindings: [bindings: TX6Bindings]
		status: [status: TX6ConnectionStatus]
		error: [error: unknown]
		/** Fired after any change to connection state or control values. */
		change: []
	}

/**
 * A TX-6 mixer. Platform-agnostic: bring a {@link TX6Transport} for the
 * environment you're in, or feed MIDI in yourself with {@link TX6.receive}.
 */
export class TX6 {
	readonly #emitter = new Emitter<TX6Events>()
	readonly #values = new Map<TX6EventType, TX6EventParameters>()
	readonly #channel: number | undefined
	#bindings: TX6Bindings
	#defaultTransport: TX6Transport | undefined

	#state: TX6ConnectionState = { status: 'disconnected', error: undefined }
	#transport: TX6Transport | undefined
	#connecting: Promise<void> | undefined
	/** Bumped on every connect/disconnect so stale transport callbacks are ignored. */
	#generation = 0

	constructor(options: TX6Options = {}) {
		this.#defaultTransport = options.transport
		this.#channel = options.channel
		this.#bindings = Object.freeze({ ...options.bindings })
	}

	/** Custom pairings, applied over the default map. A new object whenever it changes. */
	get bindings(): TX6Bindings {
		return this.#bindings
	}

	/** The control a source currently decodes to, if any. */
	resolve(source: TX6Source): TX6EventType | undefined {
		return resolveBinding(source, this.#bindings)
	}

	/**
	 * Pair a source with a control, replacing whatever it mapped to. Any other
	 * source bound to the same control keeps working, so pairing is additive.
	 * Pass `null` to ignore the source entirely.
	 */
	bind(source: TX6Source, event: TX6EventType | null) {
		this.setBindings({ ...this.#bindings, [source]: event })
	}

	/** Drop a custom pairing so the source falls back to the default map. */
	unbind(source: TX6Source) {
		if(!Object.hasOwn(this.#bindings, source))
			return

		const { [source]: _, ...rest } = this.#bindings
		this.setBindings(rest)
	}

	/** Replace every custom pairing at once; pass `{}` to restore the defaults. */
	setBindings(bindings: TX6Bindings) {
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
	get state(): TX6ConnectionState {
		return this.#state
	}

	/** Last value received for a control, or `undefined` if it hasn't moved yet. */
	getValue<E extends TX6EventType>(event: E): TX6EventParameters<E> | undefined {
		return this.#values.get(event) as TX6EventParameters<E> | undefined
	}

	on<K extends keyof TX6Events>(event: K, listener: (...args: TX6Events[K]) => void) {
		return this.#emitter.on(event, listener)
	}

	off<K extends keyof TX6Events>(event: K, listener: (...args: TX6Events[K]) => void) {
		this.#emitter.off(event, listener)
	}

	/**
	 * Subscribe to any change; returns an unsubscribe function. Bound to the
	 * instance, so it can be passed around directly (e.g. to useSyncExternalStore).
	 */
	readonly subscribe = (listener: () => void) => this.#emitter.on('change', listener)

	/**
	 * Connect through `transport` (or the one given to the constructor).
	 * Resolves once connected; rejects, and records {@link TX6.error}, on failure.
	 */
	connect(transport: TX6Transport | undefined = this.#defaultTransport): Promise<void> {
		if(this.#connecting)
			return this.#connecting
		if(this.#state.status === 'connected')
			return Promise.resolve()
		if(!transport)
			return Promise.reject(new Error('No transport provided to connect to the TX-6'))

		this.#defaultTransport ??= transport

		const generation = ++this.#generation
		const isCurrent = () => generation === this.#generation

		const sink: TX6TransportSink = {
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
				throw new Error('Connection to the TX-6 was cancelled')
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

	#receive(input: MidiMessage | ArrayLike<number>, origin: TX6MessageOrigin) {
		const message = 'status' in input ? input : toMidiMessage(input)
		if(!message)
			return

		const control = asControlInput(message)
		const source = control && toSource(control)
		const accepted = control && (this.#channel === undefined || control.channel === this.#channel)
		const target = accepted ? this.resolve(source!) : undefined
		const decoded = target && decodeControlValue(target, control!.value)

		this.#emitter.emit('message', message, { origin, source, event: decoded })

		if(!decoded)
			return

		const { event, ...parameters } = decoded
		this.#values.set(event, parameters)

		this.#emitter.emit(event, parameters as never)
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

	#setState(status: TX6ConnectionStatus, error: unknown) {
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
