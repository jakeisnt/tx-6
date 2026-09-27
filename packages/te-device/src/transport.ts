import type { MidiMessage } from './midi.js'

/** Callbacks a transport uses to hand data back to a {@link TEDevice}. */
export interface TEDeviceTransportSink {
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
 * Something that can deliver MIDI from a device: Web Bluetooth, Web MIDI, a
 * Node BLE or USB-MIDI library, a WebSocket bridge, a recording, etc.
 */
export interface TEDeviceTransport {
	/** Open the connection and start delivering messages to `sink`. Rejects on failure. */
	connect(sink: TEDeviceTransportSink): Promise<void>
	/** Close the connection. Must be safe to call when already disconnected. */
	disconnect(): Promise<void> | void
}

/** What a transport needs to know about the device it's looking for. */
export interface TransportTarget {
	/** Display name, used in error messages, e.g. `TX-6`. */
	name: string
	/** Matches the device's Web MIDI input name. */
	midiInputPattern: RegExp
}
