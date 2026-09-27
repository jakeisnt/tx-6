import { defineDevice } from '@ulnd/te-device'

import { TX6_CONTROLLERS } from './controls.js'

/** The TX-6's name and control map, as the shared driver sees it. */
export const tx6 = defineDevice({
	name: 'TX-6',
	midiInputPattern: /tx-?6/i,
	controllers: TX6_CONTROLLERS,
	// Notes use the same numbering as the controllers, as the original status-agnostic decoder did
	notes: TX6_CONTROLLERS
})
