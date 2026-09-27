import { defineDevice } from '@ulnd/te-device'

import { TP7_CONTROLLERS } from './controls.js'

/** The TP-7's name and control map, as the shared driver sees it. */
export const tp7 = defineDevice({
	name: 'TP-7',
	midiInputPattern: /tp-?7/i,
	controllers: TP7_CONTROLLERS
})
