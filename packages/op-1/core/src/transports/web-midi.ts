import type { TEDeviceTransport } from '@ulnd/te-device'
import { webMidi as teWebMidi, type WebMidiTransportOptions } from '@ulnd/te-device/web-midi'

import { op1 } from '../profile.js'

export type { MidiAccessLike, MidiInputLike, WebMidiTransportOptions } from '@ulnd/te-device/web-midi'

/** MIDI over the Web MIDI API: an OP-1 field connected by USB, or paired over Bluetooth in your OS. Picks the first input named like "OP-1 field". */
export function webMidi(options?: WebMidiTransportOptions): TEDeviceTransport {
	return teWebMidi(op1, options)
}
