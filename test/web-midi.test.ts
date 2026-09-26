import { expect, mock, test } from 'bun:test'

import { TX6 } from '../src/index.ts'
import { webMidi } from '../src/transports/web-midi.ts'

test('webMidi picks the TX-6 input and forwards messages', async () => {
	type Listener = (event: { data?: Uint8Array | null }) => void
	const listeners = new Set<Listener>()
	const tx6Input = {
		name: 'TX-6 Bluetooth',
		addEventListener: (_: string, listener: Listener) => listeners.add(listener),
		removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
		close: mock(async () => {})
	}
	const other = { ...tx6Input, name: 'Some Keyboard' }
	const access = { inputs: new Map([['a', other], ['b', tx6Input]]) }

	const tx6 = new TX6({ transport: webMidi({ access }) })
	await tx6.connect()

	for(const listener of listeners)
		listener({ data: new Uint8Array([0xb0, 35, 127]) })
	expect(tx6.getValue('shift')).toEqual({ pressed: true, value: 127 })

	await tx6.disconnect()
	expect(listeners.size).toBe(0)
	expect(tx6Input.close).toHaveBeenCalled()
})

test('webMidi fails when no TX-6 is attached', async () => {
	const tx6 = new TX6({ transport: webMidi({ access: { inputs: new Map() } }) })
	await expect(tx6.connect()).rejects.toThrow('No TX-6 MIDI input found')
})
