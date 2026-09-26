import type { TX6Transport } from '../transport.js'

// Minimal structural subset of the Web MIDI API, so this module type-checks
// without the DOM lib and works with any implementation.

export interface MidiInputLike {
	name?: string | null
	state?: string
	addEventListener(type: 'midimessage', listener: (event: { data?: Uint8Array | null }) => void): void
	removeEventListener(type: 'midimessage', listener: (event: { data?: Uint8Array | null }) => void): void
	close?(): Promise<unknown>
}

export interface MidiAccessLike {
	inputs: { values(): Iterable<MidiInputLike> }
	addEventListener?(type: 'statechange', listener: (event: { port?: { name?: string | null, state?: string } | null }) => void): void
	removeEventListener?(type: 'statechange', listener: (event: { port?: { name?: string | null, state?: string } | null }) => void): void
}

export interface WebMidiTransportOptions {
	/** MIDI access object. Defaults to `navigator.requestMIDIAccess()`. */
	access?: MidiAccessLike | (() => Promise<MidiAccessLike>)
	/** Pick the input to use. Defaults to the first one whose name contains "TX-6". */
	selectInput?: (inputs: MidiInputLike[]) => MidiInputLike | undefined
}

const defaultSelectInput = (inputs: MidiInputLike[]) => inputs.find(input => /tx-?6/i.test(input.name ?? ''))

/** MIDI over the Web MIDI API, e.g. a TX-6 connected by USB. */
export function webMidi(options: WebMidiTransportOptions = {}): TX6Transport {
	let cleanup: (() => void) | undefined

	const teardown = () => {
		cleanup?.()
		cleanup = undefined
	}

	return {
		async connect(sink) {
			teardown()

			const access = await resolveAccess(options.access)
			const input = (options.selectInput ?? defaultSelectInput)([...access.inputs.values()])
			if(!input)
				throw new Error('No TX-6 MIDI input found')

			const onMessage = (event: { data?: Uint8Array | null }) => {
				if(event.data)
					sink.message(event.data)
			}

			const onStateChange = (event: { port?: { name?: string | null, state?: string } | null }) => {
				if(event.port?.name === input.name && event.port?.state === 'disconnected') {
					teardown()
					sink.disconnected(new Error('TX-6 disconnected'))
				}
			}

			input.addEventListener('midimessage', onMessage)
			access.addEventListener?.('statechange', onStateChange)

			cleanup = () => {
				input.removeEventListener('midimessage', onMessage)
				access.removeEventListener?.('statechange', onStateChange)
				input.close?.().catch(() => {})
			}
		},

		disconnect() {
			teardown()
		}
	}
}

async function resolveAccess(access: WebMidiTransportOptions['access']): Promise<MidiAccessLike> {
	if(typeof access === 'function')
		return access()
	if(access)
		return access

	const navigator = (globalThis as { navigator?: { requestMIDIAccess?: () => Promise<MidiAccessLike> } }).navigator
	if(!navigator?.requestMIDIAccess)
		throw new Error('Web MIDI is not available in this environment')

	return navigator.requestMIDIAccess()
}
