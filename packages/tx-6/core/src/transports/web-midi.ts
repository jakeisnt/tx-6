import type { TEDeviceTransport } from '@ulnd/te-device'
import { webMidi as teWebMidi, type WebMidiTransportOptions } from '@ulnd/te-device/web-midi'

import { tx6 } from '../profile.js'

export type { MidiAccessLike, MidiInputLike, WebMidiTransportOptions } from '@ulnd/te-device/web-midi'

/** MIDI over the Web MIDI API: a TX-6 connected by USB, or paired over Bluetooth in your OS. Picks the first input named like "TX-6". */
export function webMidi(options?: WebMidiTransportOptions): TEDeviceTransport {
	return teWebMidi(tx6, options)
}
