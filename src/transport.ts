import type { MidiMessage } from './midi.js'

/** Callbacks a transport uses to hand data back to a {@link TX6} instance. */
export interface TX6TransportSink {
	/** Deliver one complete MIDI message received from the device. */
	message(message: MidiMessage | ArrayLike<number>): void
	/**
	 * Optionally report the raw bytes as they arrived (e.g. one BLE-MIDI packet),
	 * before parsing. Used for diagnostics only; call it before `message`.
	 */
	packet?(bytes: Uint8Array): void
	/** Report that the connection was lost; pass an error if it was unexpected. */
	disconnected(error?: unknown): void
}

/**
 * Something that can deliver MIDI from a TX-6: Web Bluetooth, Web MIDI, a
 * Node BLE or USB-MIDI library, a WebSocket bridge, a recording, etc.
 */
export interface TX6Transport {
	/** Open the connection and start delivering messages to `sink`. Rejects on failure. */
	connect(sink: TX6TransportSink): Promise<void>
	/** Close the connection. Must be safe to call when already disconnected. */
	disconnect(): Promise<void> | void
}
