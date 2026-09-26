/** A single, complete MIDI message: a status byte followed by its data bytes. */
export interface MidiMessage {
	status: number
	data: readonly number[]
}

/**
 * Number of data bytes that follow a given status byte, or `undefined` for
 * variable-length (SysEx) and undefined status bytes.
 */
export function dataLength(status: number): number | undefined {
	if(status < 0x80)
		return undefined

	if(status < 0xf0) {
		// Channel voice messages: program change and channel pressure take one byte
		const type = status & 0xf0
		return type === 0xc0 || type === 0xd0 ? 1 : 2
	}

	switch(status) {
	case 0xf1: // MTC quarter frame
	case 0xf3: // Song select
		return 1
	case 0xf2: // Song position pointer
		return 2
	case 0xf6: // Tune request
	case 0xf8: case 0xfa: case 0xfb: case 0xfc: case 0xfe: case 0xff: // Real-time
		return 0
	default: // 0xf0 / 0xf7 (SysEx) and undefined 0xf4, 0xf5, 0xf9, 0xfd
		return undefined
	}
}

/** Coerce any array-like of bytes into a {@link MidiMessage}. */
export function toMidiMessage(bytes: ArrayLike<number>): MidiMessage | undefined {
	if(bytes.length === 0 || (bytes[0]! & 0x80) === 0)
		return undefined

	return { status: bytes[0]!, data: Array.from(bytes).slice(1) }
}

/** A decoded Control Change message. */
export interface ControlChange {
	channel: number
	controller: number
	value: number
}

/** Returns the Control Change carried by `message`, if it is one. */
export function asControlChange(message: MidiMessage): ControlChange | undefined {
	if((message.status & 0xf0) !== 0xb0 || message.data.length < 2)
		return undefined

	return {
		channel: message.status & 0x0f,
		controller: message.data[0]! & 0x7f,
		value: message.data[1]! & 0x7f
	}
}
