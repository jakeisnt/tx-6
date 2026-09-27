import type { TEDeviceTransport } from '@ulnd/te-device'
import { webMidi as teWebMidi, type WebMidiTransportOptions } from '@ulnd/te-device/web-midi'

import { tp7 } from '../profile.js'

export type { MidiAccessLike, MidiInputLike, WebMidiTransportOptions } from '@ulnd/te-device/web-midi'

/** MIDI over the Web MIDI API: a TP-7 connected by USB, or paired over Bluetooth in your OS. Picks the first input named like "TP-7". */
export function webMidi(options?: WebMidiTransportOptions): TEDeviceTransport {
	return teWebMidi(tp7, options)
}
