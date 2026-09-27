import type { TEDeviceTransport } from '@ulnd/te-device'
import { webBluetooth as teWebBluetooth, type WebBluetoothTransportOptions } from '@ulnd/te-device/web-bluetooth'

import { tp7 } from '../profile.js'

export type {
	BluetoothCharacteristicLike,
	BluetoothDeviceLike,
	BluetoothLike,
	BluetoothServerLike,
	BluetoothServiceLike,
	WebBluetoothTransportOptions
} from '@ulnd/te-device/web-bluetooth'

/**
 * BLE-MIDI over the Web Bluetooth API. In browsers, `connect()` must be called
 * from a user gesture (e.g. a click handler) so the device picker can open.
 */
export function webBluetooth(options?: WebBluetoothTransportOptions): TEDeviceTransport {
	return teWebBluetooth(tp7, options)
}
