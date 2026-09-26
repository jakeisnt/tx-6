import { decodeMidiMessage, type TX6Event, type TX6EventParameters, type TX6EventType } from './controls.js'
import { Emitter } from './emitter.js'
import { type MidiMessage, toMidiMessage } from './midi.js'
import type { TX6Transport, TX6TransportSink } from './transport.js'

export type TX6ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export interface TX6Options {
	/** Transport used by {@link TX6.connect} when none is passed explicitly. */
	transport?: TX6Transport
	/** Only accept messages on this MIDI channel (0–15). Defaults to any channel. */
	channel?: number
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
		/** Every raw MIDI message received, including ones that aren't TX-6 controls. */
		message: [message: MidiMessage]
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
	#defaultTransport: TX6Transport | undefined

	#state: TX6ConnectionState = { status: 'disconnected', error: undefined }
	#transport: TX6Transport | undefined
	#connecting: Promise<void> | undefined
	/** Bumped on every connect/disconnect so stale transport callbacks are ignored. */
	#generation = 0

	constructor(options: TX6Options = {}) {
		this.#defaultTransport = options.transport
		this.#channel = options.channel
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
					this.receive(message)
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
		const message = 'status' in input ? input : toMidiMessage(input)
		if(!message)
			return

		this.#emitter.emit('message', message)

		const decoded = decodeMidiMessage(message, { channel: this.#channel })
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
