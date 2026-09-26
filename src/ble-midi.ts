import { dataLength, type MidiMessage } from './midi.js'

/** Bluetooth LE MIDI service UUID (from the BLE-MIDI 1.0 specification). */
export const BLE_MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700'

/** Bluetooth LE MIDI I/O characteristic UUID. */
export const BLE_MIDI_CHARACTERISTIC_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3'

/**
 * Parse one BLE-MIDI packet (the value of a characteristic notification) into
 * the MIDI messages it contains.
 *
 * A packet is a header byte followed by any number of messages, each normally
 * preceded by a timestamp byte. Messages may use running status, and real-time
 * messages may be interleaved. SysEx is skipped, since the TX-6 never sends it.
 */
export function parseBLEMidiPacket(packet: ArrayLike<number> | ArrayBufferView | ArrayBufferLike): MidiMessage[] {
	const bytes = toBytes(packet)
	const messages: MidiMessage[] = []

	// Header byte must have bit 7 set and bit 6 clear
	if(bytes.length < 2 || (bytes[0]! & 0xc0) !== 0x80)
		return messages

	let runningStatus: number | undefined
	let inSysEx = false
	let i = 1

	while(i < bytes.length) {
		let byte = bytes[i]!

		if(byte & 0x80) {
			// Timestamp byte; the next byte is either a status byte or running-status data
			i++
			if(i >= bytes.length)
				break

			byte = bytes[i]!
			if(byte & 0x80) {
				i++

				if(byte === 0xf0) {
					inSysEx = true
					runningStatus = undefined
					continue
				}

				if(byte === 0xf7) {
					inSysEx = false
					continue
				}

				const length = dataLength(byte)
				if(length === undefined) {
					runningStatus = undefined
					continue
				}

				// Real-time messages don't affect running status
				if(byte >= 0xf8) {
					messages.push({ status: byte, data: [] })
					continue
				}

				runningStatus = byte < 0xf0 ? byte : undefined
				i = readMessage(bytes, i, byte, length, messages)
				continue
			}
		}

		// Data byte without a status byte: SysEx payload or running status
		if(inSysEx || runningStatus === undefined) {
			i++
			continue
		}

		i = readMessage(bytes, i, runningStatus, dataLength(runningStatus)!, messages)
	}

	return messages
}

function readMessage(bytes: Uint8Array, start: number, status: number, length: number, out: MidiMessage[]) {
	const data: number[] = []
	let i = start

	while(data.length < length && i < bytes.length && (bytes[i]! & 0x80) === 0)
		data.push(bytes[i++]!)

	// Drop truncated messages rather than emitting garbage
	if(data.length === length)
		out.push({ status, data })

	return i
}

function toBytes(packet: ArrayLike<number> | ArrayBufferView | ArrayBufferLike): Uint8Array {
	if(packet instanceof Uint8Array)
		return packet

	if(ArrayBuffer.isView(packet))
		return new Uint8Array(packet.buffer, packet.byteOffset, packet.byteLength)

	if(packet instanceof ArrayBuffer || (typeof SharedArrayBuffer !== 'undefined' && packet instanceof SharedArrayBuffer))
		return new Uint8Array(packet)

	return Uint8Array.from(packet as ArrayLike<number>)
}
