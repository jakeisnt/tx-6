import { describe, expect, test } from 'bun:test'

import { defineDevice } from '../src/index.ts'
import { TestDevice, testDevice } from './fakes.ts'

describe('defineDevice', () => {
	test('derives the control list and kinds from the map', () => {
		expect(testDevice.controls).toEqual(['fader', 'knob', 'pad', 'dial'])
		expect(testDevice.kindOf('dial')).toBe('encoder')
		expect(testDevice.isControl('pad')).toBe(true)
		expect(testDevice.isControl('nope')).toBe(false)
		expect(testDevice.controllerFor('knob')).toBe(2)
	})

	test('decodes each kind', () => {
		expect(testDevice.decodeControlChange({ channel: 0, controller: 1, value: 127 })).toEqual({ event: 'fader', progress: 1, value: 127 })
		expect(testDevice.decodeControlChange({ channel: 0, controller: 3, value: 64 })).toEqual({ event: 'pad', pressed: true, value: 64 })
		expect(testDevice.decodeControlChange({ channel: 0, controller: 4, value: 126 })).toEqual({ event: 'dial', direction: 'left', delta: -2, value: 126 })
		expect(testDevice.decodeControlChange({ channel: 0, controller: 4, value: 64 })).toBeUndefined()
		expect(testDevice.decodeControlChange({ channel: 0, controller: 9, value: 1 })).toBeUndefined()
	})

	test('notes decode only when the device maps them, or once paired', () => {
		expect(testDevice.decodeMidiMessage({ status: 0x90, data: [3, 127] })).toBeUndefined()
		expect(testDevice.decodeMidiMessage({ status: 0x90, data: [3, 127] }, { bindings: { 'note:3': 'pad' } })).toMatchObject({ event: 'pad', pressed: true })

		const withNotes = defineDevice<{ key: 'button' }>({
			name: 'Keys',
			midiInputPattern: /keys/i,
			controllers: new Map(),
			notes: new Map([[60, { event: 'key', kind: 'button' }]])
		})
		expect(withNotes.decodeMidiMessage({ status: 0x80, data: [60, 10] })).toEqual({ event: 'key', pressed: false, value: 0 })
		expect(withNotes.controllerFor('key')).toBeUndefined()
	})

	test('rejects controls named like a device event', () => {
		expect(() => defineDevice<{ change: 'button' }>({
			name: 'Bad',
			midiInputPattern: /bad/,
			controllers: new Map([[1, { event: 'change', kind: 'button' }]])
		})).toThrow('reserved')
	})
})

test('errors name the device', async () => {
	await expect(new TestDevice().connect()).rejects.toThrow('No transport provided to connect to the Test-1')
})
