import { TEDevice, type TEDeviceOptions } from '@ulnd/te-device'

import type { OP1ControlKinds } from './controls.js'
import { op1Profile } from './profile.js'

export type OP1Options = TEDeviceOptions<OP1ControlKinds>

/**
 * A OP-1 field synthesizer. Platform-agnostic: bring a {@link OP1Transport} for the
 * environment you're in, or feed MIDI in yourself with {@link OP1.receive}.
 */
export class OP1 extends TEDevice<OP1ControlKinds> {
	constructor(options: OP1Options = {}) {
		super(op1Profile, options)
	}
}
