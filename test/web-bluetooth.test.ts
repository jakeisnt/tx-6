import { describe, expect, mock, test } from 'bun:test'

import { BLE_MIDI_CHARACTERISTIC_UUID, BLE_MIDI_SERVICE_UUID, TX6 } from '../src/index.ts'
import { webBluetooth } from '../src/transports/web-bluetooth.ts'

class FakeTarget {
	listeners = new Map<string, Set<(event: unknown) => void>>()
	addEventListener(type: string, listener: (event: unknown) => void) {
		if(!this.listeners.has(type))
			this.listeners.set(type, new Set())
		this.listeners.get(type)!.add(listener)
	}
	removeEventListener(type: string, listener: (event: unknown) => void) {
		this.listeners.get(type)?.delete(listener)
	}
	dispatch(type: string) {
		for(const listener of this.listeners.get(type) ?? [])
			listener({ target: this })
	}
}

function fakeBluetooth() {
	const characteristic = Object.assign(new FakeTarget(), {
		value: null as DataView | null,
		startNotifications: mock(async () => {}),
		stopNotifications: mock(async () => {}),
		notify(...bytes: number[]) {
			characteristic.value = new DataView(new Uint8Array(bytes).buffer)
			characteristic.dispatch('characteristicvaluechanged')
		}
	})
	const server = {
		connected: true,
		getPrimaryService: mock(async (uuid: string) => {
			expect(uuid).toBe(BLE_MIDI_SERVICE_UUID)
			return {
				getCharacteristic: async (id: string) => {
					expect(id).toBe(BLE_MIDI_CHARACTERISTIC_UUID)
					return characteristic
				}
			}
		}),
		disconnect: mock(() => {
			server.connected = false
			device.dispatch('gattserverdisconnected')
		})
	}
	const device = Object.assign(new FakeTarget(), {
		gatt: { connect: async () => {
			server.connected = true
			return server
		} }
	})
	const bluetooth = { requestDevice: mock(async () => device) }

	return { bluetooth, device, server, characteristic }
}

describe('webBluetooth', () => {
	test('streams BLE-MIDI into a TX6', async () => {
		const fake = fakeBluetooth()
		const tx6 = new TX6({ transport: webBluetooth({ bluetooth: fake.bluetooth }) })

		await tx6.connect()
		expect(tx6.status).toBe('connected')
		expect(fake.bluetooth.requestDevice).toHaveBeenCalledWith({
			filters: [{ services: [BLE_MIDI_SERVICE_UUID] }],
			optionalServices: [BLE_MIDI_SERVICE_UUID]
		})
		expect(fake.characteristic.startNotifications).toHaveBeenCalled()

		fake.characteristic.notify(0x80, 0x80, 0xb0, 0x19, 0x7f, 0x81, 0x07, 0x40)
		expect(tx6.getValue('input1.button')).toEqual({ pressed: true, value: 127 })
		expect(tx6.getValue('input1.eq1')).toEqual({ progress: 64 / 127, value: 64 })

		await tx6.disconnect()
		expect(fake.server.disconnect).toHaveBeenCalled()
		expect(fake.characteristic.listeners.get('characteristicvaluechanged')?.size).toBe(0)
		expect(fake.device.listeners.get('gattserverdisconnected')?.size).toBe(0)
		// An intentional disconnect is not an error
		expect(tx6.error).toBeUndefined()
	})

	test('reports the device dropping out', async () => {
		const fake = fakeBluetooth()
		const tx6 = new TX6({ transport: webBluetooth({ bluetooth: fake.bluetooth }) })
		await tx6.connect()

		fake.server.connected = false
		fake.device.dispatch('gattserverdisconnected')
		expect(tx6.status).toBe('disconnected')
		expect(tx6.error).toBeInstanceOf(Error)
	})

	test('uses a pre-selected device without prompting', async () => {
		const fake = fakeBluetooth()
		await new TX6().connect(webBluetooth({ device: fake.device }))
		expect(fake.bluetooth.requestDevice).not.toHaveBeenCalled()
	})

	test('fails cleanly without Web Bluetooth', async () => {
		const tx6 = new TX6({ transport: webBluetooth() })
		await expect(tx6.connect()).rejects.toThrow('Web Bluetooth is not available')
		expect(tx6.status).toBe('disconnected')
	})
})
