import { describe, expect, test } from 'bun:test'

import { parseBLEMidiPacket } from '../src/index.ts'

describe('parseBLEMidiPacket', () => {
	test('single message', () => {
		expect(parseBLEMidiPacket([0x80, 0x80, 0xb0, 0x01, 0x40])).toEqual([{ status: 0xb0, data: [0x01, 0x40] }])
	})

	test('accepts DataView and ArrayBuffer', () => {
		const bytes = new Uint8Array([0x00, 0x80, 0x80, 0xb0, 0x19, 0x7f])
		expect(parseBLEMidiPacket(new DataView(bytes.buffer, 1))).toEqual([{ status: 0xb0, data: [0x19, 0x7f] }])
		expect(parseBLEMidiPacket(bytes.slice(1).buffer)).toHaveLength(1)
	})

	test('multiple messages with timestamps', () => {
		expect(parseBLEMidiPacket([0x80, 0x81, 0xb0, 0x01, 0x10, 0x82, 0xb0, 0x02, 0x20])).toEqual([
			{ status: 0xb0, data: [0x01, 0x10] },
			{ status: 0xb0, data: [0x02, 0x20] }
		])
	})

	test('running status with and without timestamps', () => {
		expect(parseBLEMidiPacket([0x80, 0x80, 0xb0, 0x01, 0x10, 0x02, 0x20, 0x81, 0x03, 0x30])).toEqual([
			{ status: 0xb0, data: [0x01, 0x10] },
			{ status: 0xb0, data: [0x02, 0x20] },
			{ status: 0xb0, data: [0x03, 0x30] }
		])
	})

	test('interleaved real-time messages keep running status', () => {
		expect(parseBLEMidiPacket([0x80, 0x80, 0xb0, 0x01, 0x10, 0x81, 0xf8, 0x02, 0x20])).toEqual([
			{ status: 0xb0, data: [0x01, 0x10] },
			{ status: 0xf8, data: [] },
			{ status: 0xb0, data: [0x02, 0x20] }
		])
	})

	test('skips sysex', () => {
		expect(parseBLEMidiPacket([0x80, 0x80, 0xf0, 0x7e, 0x01, 0x02, 0x81, 0xf7, 0x82, 0xb0, 0x01, 0x10])).toEqual([
			{ status: 0xb0, data: [0x01, 0x10] }
		])
	})

	test('rejects malformed or truncated packets', () => {
		expect(parseBLEMidiPacket([])).toEqual([])
		expect(parseBLEMidiPacket([0x00, 0x80, 0xb0, 0x01, 0x10])).toEqual([])
		expect(parseBLEMidiPacket([0x80, 0x80, 0xb0, 0x01])).toEqual([])
		expect(parseBLEMidiPacket([0x80, 0x01, 0x02])).toEqual([])
	})
})
