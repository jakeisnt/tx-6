import type { ControlDefinition } from '@ulnd/te-device'

// Best effort, and unverified against hardware: teenage engineering doesn't
// publish a controller map for the TP-7. Every number here is a placeholder
// until someone confirms it on a real TP-7 (docs/tp-7-midi.md). Pairing mode on
// the site, or `TP7.bind()`, fixes any wrong number without a release.

export const TP7_BUTTONS = ['button1', 'button2', 'button3', 'record', 'play', 'stop'] as const

export type TP7ButtonEvent = typeof TP7_BUTTONS[number]
/** The motorised reel, which turns in relative steps like an encoder. */
export type TP7EncoderEvent = 'reel'

/** Every TP-7 control and its kind. */
export type TP7ControlKinds =
	& { readonly [C in TP7ButtonEvent]: 'button' }
	& { readonly [C in TP7EncoderEvent]: 'encoder' }

/** Controller number → control. Unverified; see docs/tp-7-midi.md. */
export const TP7_CONTROLLERS: ReadonlyMap<number, ControlDefinition<TP7ControlKinds>> = new Map<number, ControlDefinition<TP7ControlKinds>>([
	[1, { event: 'reel', kind: 'encoder' }], // unverified
	...TP7_BUTTONS.map((event, index) => [2 + index, { event, kind: 'button' }] as const) // unverified: 2–7
])
