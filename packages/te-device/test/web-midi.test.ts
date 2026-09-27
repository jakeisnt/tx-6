import { expect, mock, test } from 'bun:test'

import { webMidi } from '../src/transports/web-midi.ts'
import { TestDevice, testDevice } from './fakes.ts'

test('webMidi picks the matching input and forwards messages', async () => {
	type Listener = (event: { data?: Uint8Array | null }) => void
	const listeners = new Set<Listener>()
	const deviceInput = {
		name: 'Test-1 Bluetooth',
		addEventListener: (_: string, listener: Listener) => listeners.add(listener),
		removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
		close: mock(async () => {})
	}
	const other = { ...deviceInput, name: 'Some Keyboard' }
	const access = { inputs: new Map([['a', other], ['b', deviceInput]]) }

	const device = new TestDevice({ transport: webMidi(testDevice, { access }) })
	await device.connect()

	for(const listener of listeners)
		listener({ data: new Uint8Array([0xb0, 3, 127]) })
	expect(device.getValue('pad')).toEqual({ pressed: true, value: 127 })

	await device.disconnect()
	expect(listeners.size).toBe(0)
	expect(deviceInput.close).toHaveBeenCalled()
})

test('webMidi fails when no matching device is attached', async () => {
	const device = new TestDevice({ transport: webMidi(testDevice, { access: { inputs: new Map() } }) })
	await expect(device.connect()).rejects.toThrow('No Test-1 MIDI input found')
})
