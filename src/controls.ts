import { asControlChange, type ControlChange, type MidiMessage } from './midi.js'

export const INPUTS = [1, 2, 3, 4, 5, 6] as const
export type TX6Input = typeof INPUTS[number]

export type TX6SliderEvent = `input${TX6Input}.slider`
export type TX6EqEvent = `input${TX6Input}.eq${1 | 2 | 3}`
export type TX6ButtonEvent = `input${TX6Input}.button` | 'select.button' | 'fx1' | 'fx2' | 'shift' | 'aux' | 'cue'
export type TX6EncoderEvent = 'select.encoder'

export type TX6EventType = TX6SliderEvent | TX6EqEvent | TX6ButtonEvent | TX6EncoderEvent

/** Payload for sliders and EQ knobs. */
export interface TX6RangeParameters {
	/** Normalised position, 0–1. Sliders read 1 at the top of their travel. */
	progress: number
	/** Raw 7-bit MIDI value, 0–127. */
	value: number
}

/** Payload for buttons. */
export interface TX6ButtonParameters {
	pressed: boolean
	value: number
}

/** Payload for the select encoder, which sends relative steps. */
export interface TX6EncoderParameters {
	direction: 'left' | 'right'
	/** Signed number of detents moved; positive is clockwise (right). */
	delta: number
	value: number
}

export type TX6EventParameterMap =
	& { [K in TX6SliderEvent | TX6EqEvent]: TX6RangeParameters }
	& { [K in TX6ButtonEvent]: TX6ButtonParameters }
	& { [K in TX6EncoderEvent]: TX6EncoderParameters }

export type TX6EventParameters<E extends TX6EventType = TX6EventType> = TX6EventParameterMap[E]

/** A decoded TX-6 control event, discriminated on `event`. */
export type TX6Event = { [E in TX6EventType]: { event: E } & TX6EventParameterMap[E] }[TX6EventType]

type ControlKind = 'slider' | 'knob' | 'button' | 'encoder'

/** Controller number → control, as sent by the TX-6 in controller mode (midi menu: ctrl out). See docs/midi.md. */
export const TX6_CONTROLLERS: ReadonlyMap<number, { event: TX6EventType, kind: ControlKind }> = (() => {
	const map = new Map<number, { event: TX6EventType, kind: ControlKind }>()

	for(const n of INPUTS) {
		map.set(n, { event: `input${n}.slider`, kind: 'slider' })
		map.set(6 + n, { event: `input${n}.eq1`, kind: 'knob' })
		map.set(12 + n, { event: `input${n}.eq2`, kind: 'knob' })
		map.set(18 + n, { event: `input${n}.eq3`, kind: 'knob' })
		map.set(24 + n, { event: `input${n}.button`, kind: 'button' })
	}

	map.set(31, { event: 'select.encoder', kind: 'encoder' })

	const buttons = ['select.button', 'fx1', 'fx2', 'shift', 'aux', 'cue'] as const
	for(const [index, event] of buttons.entries())
		map.set(32 + index, { event, kind: 'button' })

	return map
})()

export const TX6_EVENT_TYPES: readonly TX6EventType[] = [...TX6_CONTROLLERS.values()].map(control => control.event)

export function isTX6EventType(value: unknown): value is TX6EventType {
	return typeof value === 'string' && (TX6_EVENT_TYPES as readonly string[]).includes(value)
}

/** Decode a Control Change from the TX-6 into a control event. */
export function decodeControlChange({ controller, value }: ControlChange): TX6Event | undefined {
	const control = TX6_CONTROLLERS.get(controller)
	if(!control)
		return undefined

	switch(control.kind) {
	case 'slider':
		// Sliders send 0 at the top of their travel
		return { event: control.event, progress: 1 - value / 127, value } as TX6Event
	case 'knob':
		return { event: control.event, progress: value / 127, value } as TX6Event
	case 'button':
		return { event: control.event, pressed: value >= 64, value } as TX6Event
	case 'encoder': {
		// Relative, two's complement: 1..63 clockwise, 65..127 counter-clockwise
		const delta = value < 64 ? value : value - 128
		if(delta === 0 || value === 64)
			return undefined

		return { event: 'select.encoder', direction: delta > 0 ? 'right' : 'left', delta, value }
	}
	}
}

/** Decode a raw MIDI message into a TX-6 control event, if it is one. */
export function decodeMidiMessage(message: MidiMessage, options: { channel?: number } = {}): TX6Event | undefined {
	const cc = asControlChange(message)
	if(!cc || (options.channel !== undefined && cc.channel !== options.channel))
		return undefined

	return decodeControlChange(cc)
}
