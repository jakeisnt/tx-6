import { BLE_MIDI_CHARACTERISTIC_UUID, BLE_MIDI_SERVICE_UUID, parseBLEMidiPacket } from '../ble-midi.js'
import type { TX6Transport } from '../transport.js'

// Minimal structural subset of the Web Bluetooth API, so this module type-checks
// without the DOM lib and works with any implementation (browsers, or packages
// such as `webbluetooth` that provide the same API on Node).

interface EventTargetLike {
	addEventListener(type: string, listener: (event: unknown) => void): void
	removeEventListener(type: string, listener: (event: unknown) => void): void
}

export interface BluetoothCharacteristicLike extends EventTargetLike {
	value?: DataView | null
	startNotifications(): Promise<unknown>
	stopNotifications(): Promise<unknown>
}

export interface BluetoothServiceLike {
	getCharacteristic(uuid: string): Promise<BluetoothCharacteristicLike>
}

export interface BluetoothServerLike {
	connected: boolean
	getPrimaryService(uuid: string): Promise<BluetoothServiceLike>
	disconnect(): void
}

export interface BluetoothDeviceLike extends EventTargetLike {
	gatt?: { connect(): Promise<BluetoothServerLike> } | null
}

export interface BluetoothLike {
	requestDevice(options: { filters: { services?: string[], name?: string, namePrefix?: string }[], optionalServices?: string[] }): Promise<BluetoothDeviceLike>
}

export interface WebBluetoothTransportOptions {
	/**
	 * Web Bluetooth implementation. Defaults to `navigator.bluetooth`.
	 * Pass your own to use this transport outside a browser.
	 */
	bluetooth?: BluetoothLike
	/** Use an already-chosen device instead of showing the device picker. */
	device?: BluetoothDeviceLike
	/** Extra filters for the device picker. Defaults to any BLE-MIDI device. */
	filters?: { services?: string[], name?: string, namePrefix?: string }[]
}

/**
 * BLE-MIDI over the Web Bluetooth API. In browsers, `connect()` must be called
 * from a user gesture (e.g. a click handler) so the device picker can open.
 */
export function webBluetooth(options: WebBluetoothTransportOptions = {}): TX6Transport {
	let device: BluetoothDeviceLike | undefined
	let server: BluetoothServerLike | undefined
	let characteristic: BluetoothCharacteristicLike | undefined
	let cleanup: (() => void) | undefined

	const teardown = () => {
		cleanup?.()
		cleanup = undefined
		characteristic = undefined
		device = undefined

		const current = server
		server = undefined
		if(current?.connected)
			current.disconnect()
	}

	return {
		async connect(sink) {
			teardown()

			const bluetooth = options.bluetooth ?? getNavigatorBluetooth()
			if(!options.device && !bluetooth)
				throw new Error('Web Bluetooth is not available in this environment')

			try {
				device = options.device ?? await bluetooth!.requestDevice({
					filters: options.filters ?? [{ services: [BLE_MIDI_SERVICE_UUID] }],
					optionalServices: [BLE_MIDI_SERVICE_UUID]
				})

				if(!device.gatt)
					throw new Error('Bluetooth device has no GATT server')

				const onValueChanged = (event: unknown) => {
					const value = (event as { target?: BluetoothCharacteristicLike }).target?.value
					if(!value)
						return

					// Copy: some implementations reuse the underlying buffer between notifications
					const bytes = new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength))
					sink.packet?.(bytes)

					for(const message of parseBLEMidiPacket(bytes))
						sink.message(message)
				}

				const onDisconnected = () => {
					teardown()
					sink.disconnected(new Error('TX-6 disconnected'))
				}

				const currentDevice = device
				currentDevice.addEventListener('gattserverdisconnected', onDisconnected)
				cleanup = () => {
					currentDevice.removeEventListener('gattserverdisconnected', onDisconnected)
					characteristic?.removeEventListener('characteristicvaluechanged', onValueChanged)
					characteristic?.stopNotifications().catch(() => {})
				}

				server = await device.gatt.connect()
				const service = await server.getPrimaryService(BLE_MIDI_SERVICE_UUID)
				characteristic = await service.getCharacteristic(BLE_MIDI_CHARACTERISTIC_UUID)
				characteristic.addEventListener('characteristicvaluechanged', onValueChanged)
				await characteristic.startNotifications()
			} catch(error) {
				teardown()
				throw error
			}
		},

		disconnect() {
			teardown()
		}
	}
}

function getNavigatorBluetooth(): BluetoothLike | undefined {
	return (globalThis as { navigator?: { bluetooth?: BluetoothLike } }).navigator?.bluetooth
}
