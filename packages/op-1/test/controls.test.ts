import { expect, test } from 'bun:test'

import { decodeMidiMessage, OP1, OP1_BUTTONS, OP1_CONTROLLERS, OP1_ENCODERS, OP1_EVENT_TYPES } from '../src/index.ts'

test('maps every encoder, encoder push and button to its own controller', () => {
	expect(OP1_EVENT_TYPES).toHaveLength(OP1_ENCODERS.length * 2 + OP1_BUTTONS.length)
	expect(OP1_CONTROLLERS.size).toBe(OP1_EVENT_TYPES.length)
})

test('encoders are relative', () => {
	expect(decodeMidiMessage({ status: 0xb0, data: [1, 1] })).toEqual({ event: 'blue.encoder', direction: 'right', delta: 1, value: 1 })
	expect(decodeMidiMessage({ status: 0xb0, data: [4, 127] })).toEqual({ event: 'orange.encoder', direction: 'left', delta: -1, value: 127 })
	expect(decodeMidiMessage({ status: 0xb0, data: [66, 127] })).toMatchObject({ event: 'white.button', pressed: true })
})

test('keyboard notes are left unmapped', () => {
	const op1 = new OP1()
	const events: unknown[] = []
	op1.on('event', event => events.push(event))
	op1.receive([0x90, 53, 100])
	expect(events).toEqual([])
	op1.receive([0xb0, 39, 127])
	expect(op1.getValue('play')).toEqual({ pressed: true, value: 127 })
})
