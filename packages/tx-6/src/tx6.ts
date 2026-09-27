import { TEDevice, type TEDeviceOptions } from '@ulnd/te-device'

import type { TX6ControlKinds } from './controls.js'
import { tx6Profile } from './profile.js'

export type TX6Options = TEDeviceOptions<TX6ControlKinds>

/**
 * A TX-6 mixer. Platform-agnostic: bring a {@link TX6Transport} for the
 * environment you're in, or feed MIDI in yourself with {@link TX6.receive}.
 */
export class TX6 extends TEDevice<TX6ControlKinds> {
	constructor(options: TX6Options = {}) {
		super(tx6Profile, options)
	}
}
