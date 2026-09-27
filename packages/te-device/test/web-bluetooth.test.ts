import { describe, expect, mock, test } from 'bun:test'

import { BLE_MIDI_CHARACTERISTIC_UUID, BLE_MIDI_SERVICE_UUID } from '../src/index.ts'
import { webBluetooth } from '../src/transports/web-bluetooth.ts'
import { TestDevice, testDevice } from './fakes.ts'

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
	test('streams BLE-MIDI into a device', async () => {
		const fake = fakeBluetooth()
		const device = new TestDevice({ transport: webBluetooth(testDevice, { bluetooth: fake.bluetooth }) })

		await device.connect()
		expect(device.status).toBe('connected')
		expect(fake.bluetooth.requestDevice).toHaveBeenCalledWith({
			filters: [{ services: [BLE_MIDI_SERVICE_UUID] }],
			optionalServices: [BLE_MIDI_SERVICE_UUID]
		})
		expect(fake.characteristic.startNotifications).toHaveBeenCalled()

		const onPacket = mock()
		device.on('packet', onPacket)

		fake.characteristic.notify(0x80, 0x80, 0xb0, 0x03, 0x7f, 0x81, 0x02, 0x40)
		expect(onPacket).toHaveBeenCalledWith(new Uint8Array([0x80, 0x80, 0xb0, 0x03, 0x7f, 0x81, 0x02, 0x40]))
		expect(device.getValue('pad')).toEqual({ pressed: true, value: 127 })
		expect(device.getValue('knob')).toEqual({ progress: 64 / 127, value: 64 })

		await device.disconnect()
		expect(fake.server.disconnect).toHaveBeenCalled()
		expect(fake.characteristic.listeners.get('characteristicvaluechanged')?.size).toBe(0)
		expect(fake.device.listeners.get('gattserverdisconnected')?.size).toBe(0)
		// An intentional disconnect is not an error
		expect(device.error).toBeUndefined()
	})

	test('reports the device dropping out', async () => {
		const fake = fakeBluetooth()
		const device = new TestDevice({ transport: webBluetooth(testDevice, { bluetooth: fake.bluetooth }) })
		await device.connect()

		fake.server.connected = false
		fake.device.dispatch('gattserverdisconnected')
		expect(device.status).toBe('disconnected')
		expect(device.error).toBeInstanceOf(Error)
	})

	test('uses a pre-selected device without prompting', async () => {
		const fake = fakeBluetooth()
		await new TestDevice().connect(webBluetooth(testDevice, { device: fake.device }))
		expect(fake.bluetooth.requestDevice).not.toHaveBeenCalled()
	})

	test('fails cleanly without Web Bluetooth', async () => {
		const device = new TestDevice({ transport: webBluetooth(testDevice) })
		await expect(device.connect()).rejects.toThrow('Web Bluetooth is not available')
		expect(device.status).toBe('disconnected')
	})
})
