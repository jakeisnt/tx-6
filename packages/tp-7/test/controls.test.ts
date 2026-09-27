import { expect, test } from 'bun:test'

import { decodeControlChange, TP7, TP7_EVENT_TYPES } from '../src/index.ts'

const cc = (controller: number, value: number) => decodeControlChange({ channel: 0, controller, value })

test('maps the reel and buttons', () => {
	expect(TP7_EVENT_TYPES).toEqual(['reel', 'button1', 'button2', 'button3', 'record', 'play', 'stop'])
	expect(cc(1, 127)).toEqual({ event: 'reel', direction: 'left', delta: -1, value: 127 })
	expect(cc(5, 127)).toEqual({ event: 'record', pressed: true, value: 127 })
	expect(cc(8, 127)).toBeUndefined()
})

test('TP7 decodes and pairs like any device', () => {
	const tp7 = new TP7({ bindings: { 'note:60': 'play' } })
	tp7.receive([0x90, 60, 100])
	expect(tp7.getValue('play')).toEqual({ pressed: true, value: 100 })
	expect(tp7.profile.name).toBe('TP-7')
})
