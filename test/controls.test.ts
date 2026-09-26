import { describe, expect, test } from 'bun:test'

import { decodeControlChange, decodeMidiMessage, isTX6Source, TX6_EVENT_TYPES } from '../src/index.ts'

const cc = (controller: number, value: number) => decodeControlChange({ channel: 0, controller, value })

describe('decodeControlChange', () => {
	test('maps all 37 controls', () => {
		expect(TX6_EVENT_TYPES).toHaveLength(37)
		expect(new Set(TX6_EVENT_TYPES).size).toBe(37)
	})

	test('sliders read 1 at the top of their travel', () => {
		expect(cc(1, 127)).toEqual({ event: 'input1.slider', progress: 1, value: 127 })
		expect(cc(6, 0)).toEqual({ event: 'input6.slider', progress: 0, value: 0 })
	})

	test('eq knobs', () => {
		expect(cc(7, 127)).toEqual({ event: 'input1.eq1', progress: 1, value: 127 })
		expect(cc(18, 0)).toEqual({ event: 'input6.eq2', progress: 0, value: 0 })
		expect(cc(24, 1)).toMatchObject({ event: 'input6.eq3', progress: 1 / 127 })
	})

	test('buttons', () => {
		expect(cc(25, 127)).toEqual({ event: 'input1.button', pressed: true, value: 127 })
		expect(cc(30, 0)).toEqual({ event: 'input6.button', pressed: false, value: 0 })
		expect(cc(32, 127)).toMatchObject({ event: 'select.button', pressed: true })
		expect(cc(37, 0)).toMatchObject({ event: 'cue', pressed: false })
	})

	test('encoder is relative', () => {
		expect(cc(31, 1)).toEqual({ event: 'select.encoder', direction: 'right', delta: 1, value: 1 })
		expect(cc(31, 127)).toEqual({ event: 'select.encoder', direction: 'left', delta: -1, value: 127 })
		expect(cc(31, 3)).toMatchObject({ direction: 'right', delta: 3 })
		expect(cc(31, 125)).toMatchObject({ direction: 'left', delta: -3 })
		expect(cc(31, 0)).toBeUndefined()
	})

	test('unknown controllers are ignored', () => {
		expect(cc(0, 10)).toBeUndefined()
		expect(cc(38, 10)).toBeUndefined()
	})
})

describe('decodeMidiMessage', () => {
	test('decodes control changes and notes', () => {
		expect(decodeMidiMessage({ status: 0xb3, data: [25, 127] })).toMatchObject({ event: 'input1.button', pressed: true })
		expect(decodeMidiMessage({ status: 0x90, data: [25, 100] })).toMatchObject({ event: 'input1.button', pressed: true })
		expect(decodeMidiMessage({ status: 0x80, data: [25, 100] })).toMatchObject({ event: 'input1.button', pressed: false })
		expect(decodeMidiMessage({ status: 0xe0, data: [25, 100] })).toBeUndefined()
		expect(decodeMidiMessage({ status: 0x90, data: [60, 100] })).toBeUndefined()
	})

	test('custom bindings override the default map', () => {
		const bindings = { 'cc:74': 'input3.slider', 'note:40': 'fx1', 'cc:1': null } as const
		expect(decodeMidiMessage({ status: 0xb0, data: [74, 0] }, { bindings })).toEqual({ event: 'input3.slider', progress: 0, value: 0 })
		expect(decodeMidiMessage({ status: 0x91, data: [40, 127] }, { bindings })).toMatchObject({ event: 'fx1', pressed: true })
		expect(decodeMidiMessage({ status: 0xb0, data: [1, 0] }, { bindings })).toBeUndefined()
		expect(decodeMidiMessage({ status: 0xb0, data: [2, 0] }, { bindings })).toMatchObject({ event: 'input2.slider' })
	})

	test('channel filter', () => {
		expect(decodeMidiMessage({ status: 0xb3, data: [25, 127] }, { channel: 0 })).toBeUndefined()
		expect(decodeMidiMessage({ status: 0xb3, data: [25, 127] }, { channel: 3 })).toBeDefined()
	})
})

test('isTX6Source', () => {
	expect(isTX6Source('cc:0')).toBe(true)
	expect(isTX6Source('note:127')).toBe(true)
	expect(isTX6Source('cc:128')).toBe(false)
	expect(isTX6Source('cc:01')).toBe(false)
	expect(isTX6Source('pb:1')).toBe(false)
})
