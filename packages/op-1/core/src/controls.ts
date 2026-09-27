import type { ControlDefinition } from '@ulnd/te-device'

// Best effort, and unverified on an OP-1 field: these are the controller numbers
// the original OP-1 sends in CTRL mode, which the field is believed to keep.
// See docs/op-1-midi.md. Pairing mode on the site, or `OP1.bind()`, fixes any
// wrong number without a release. Keyboard keys arrive as notes and are left
// unmapped, since the octave setting shifts which note each key sends.

export const OP1_ENCODERS = ['blue', 'green', 'white', 'orange'] as const
export type OP1Encoder = typeof OP1_ENCODERS[number]

export type OP1EncoderEvent = `${OP1Encoder}.encoder`
export type OP1EncoderButtonEvent = `${OP1Encoder}.button`

export const OP1_BUTTONS = [
	'help', 'metronome',
	'synth', 'drum', 'tape', 'mixer',
	't1', 't2', 't3', 't4',
	'up', 'down', 'scissors', 'sequencer',
	'record', 'play', 'stop',
	'left', 'right', 'shift',
	'mic', 'com',
	'ss1', 'ss2', 'ss3', 'ss4', 'ss5', 'ss6', 'ss7', 'ss8'
] as const
export type OP1ButtonEvent = typeof OP1_BUTTONS[number] | OP1EncoderButtonEvent

/** Every OP-1 field control and its kind. */
export type OP1ControlKinds =
	& { readonly [C in OP1EncoderEvent]: 'encoder' }
	& { readonly [C in OP1ButtonEvent]: 'button' }

/** Controller number for each button, from the original OP-1's CTRL mode. All unverified on the field. */
const BUTTON_CONTROLLERS: Readonly<Record<typeof OP1_BUTTONS[number], number>> = {
	help: 5,
	metronome: 6,
	synth: 7,
	drum: 8,
	tape: 9,
	mixer: 10,
	t1: 11,
	t2: 12,
	t3: 13,
	t4: 14,
	up: 15,
	down: 16,
	scissors: 17,
	sequencer: 26,
	record: 38,
	play: 39,
	stop: 40,
	left: 41,
	right: 42,
	shift: 43,
	mic: 48,
	com: 49,
	ss1: 50,
	ss2: 51,
	ss3: 52,
	ss4: 53,
	ss5: 54,
	ss6: 55,
	ss7: 56,
	ss8: 57
}

/** Controller number → control. Unverified on the OP-1 field; see docs/op-1-midi.md. */
export const OP1_CONTROLLERS: ReadonlyMap<number, ControlDefinition<OP1ControlKinds>> = (() => {
	const map = new Map<number, ControlDefinition<OP1ControlKinds>>()

	for(const [index, colour] of OP1_ENCODERS.entries()) {
		map.set(1 + index, { event: `${colour}.encoder`, kind: 'encoder' })
		// Pushing an encoder
		map.set(64 + index, { event: `${colour}.button`, kind: 'button' })
	}

	// Too many buttons for TypeScript to check the union member by member
	for(const event of OP1_BUTTONS)
		map.set(BUTTON_CONTROLLERS[event], { event, kind: 'button' } as ControlDefinition<OP1ControlKinds>)

	return map
})()
