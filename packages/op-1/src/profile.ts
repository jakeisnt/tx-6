import { defineDevice } from '@ulnd/te-device'

import { OP1_CONTROLLERS } from './controls.js'

/** The OP-1 field's name and control map, as the shared driver sees it. */
export const op1Profile = defineDevice({
	name: 'OP-1 field',
	midiInputPattern: /op-?1/i,
	controllers: OP1_CONTROLLERS
})
