import { TEDevice, type TEDeviceOptions } from '@ulnd/te-device'

import type { TP7ControlKinds } from './controls.js'
import { tp7 } from './profile.js'

export type TP7Options = TEDeviceOptions<TP7ControlKinds>

/**
 * A TP-7 field recorder. Platform-agnostic: bring a {@link TP7Transport} for the
 * environment you're in, or feed MIDI in yourself with {@link TP7.receive}.
 */
export class TP7 extends TEDevice<TP7ControlKinds> {
	constructor(options: TP7Options = {}) {
		super(tp7, options)
	}
}
