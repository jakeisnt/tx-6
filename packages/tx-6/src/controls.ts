import { asControlInput, type ControlChange, type ControlInput, type MidiMessage } from './midi.js'

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

const KIND_OF = new Map<TX6EventType, ControlKind>([...TX6_CONTROLLERS.values()].map(control => [control.event, control.kind]))

export function isTX6EventType(value: unknown): value is TX6EventType {
	return typeof value === 'string' && KIND_OF.has(value as TX6EventType)
}

/**
 * Identifies where a control's messages come from, independent of channel:
 * `cc:<controller>` or `note:<note number>`.
 */
export type TX6Source = `cc:${number}` | `note:${number}`

/**
 * Custom pairings of MIDI sources to controls. They take precedence over the
 * default map; `null` unpairs a source the default map would otherwise decode.
 */
export type TX6Bindings = Readonly<Partial<Record<TX6Source, TX6EventType | null>>>

export function toSource(input: Pick<ControlInput, 'type' | 'number'>): TX6Source {
	return `${input.type}:${input.number}`
}

export function isTX6Source(value: unknown): value is TX6Source {
	return typeof value === 'string' && /^(cc|note):(\d|[1-9]\d|1[01]\d|12[0-7])$/.test(value)
}

/**
 * The control a source maps to by default. Controllers follow
 * {@link TX6_CONTROLLERS}; notes use the same numbering, as the original
 * status-agnostic decoder did.
 */
export function defaultBinding(source: TX6Source): TX6EventType | undefined {
	return TX6_CONTROLLERS.get(Number(source.slice(source.indexOf(':') + 1)))?.event
}

/** Resolve a source to a control, honouring custom `bindings` first. */
export function resolveBinding(source: TX6Source, bindings?: TX6Bindings): TX6EventType | undefined {
	if(bindings && Object.hasOwn(bindings, source))
		return bindings[source] ?? undefined

	return defaultBinding(source)
}

/** Decode a 7-bit value for a given control into its event payload. */
export function decodeControlValue(event: TX6EventType, value: number): TX6Event | undefined {
	switch(KIND_OF.get(event)) {
	case 'slider':
	case 'knob':
		return { event, progress: value / 127, value } as TX6Event
	case 'button':
		return { event, pressed: value >= 64, value } as TX6Event
	case 'encoder': {
		// Relative, two's complement: 1..63 clockwise, 65..127 counter-clockwise
		const delta = value < 64 ? value : value - 128
		if(delta === 0 || value === 64)
			return undefined

		return { event: 'select.encoder', direction: delta > 0 ? 'right' : 'left', delta, value }
	}
	default:
		return undefined
	}
}

/** Decode a Control Change from the TX-6 into a control event, using the default map. */
export function decodeControlChange({ controller, value }: ControlChange): TX6Event | undefined {
	const control = TX6_CONTROLLERS.get(controller)
	return control && decodeControlValue(control.event, value)
}

export interface DecodeOptions {
	/** Only accept messages on this MIDI channel (0–15). */
	channel?: number
	/** Custom pairings, applied over the default map. */
	bindings?: TX6Bindings
}

/**
 * Decode a raw MIDI message (Control Change, Note On or Note Off) into a
 * TX-6 control event, if it maps to one.
 */
export function decodeMidiMessage(message: MidiMessage, options: DecodeOptions = {}): TX6Event | undefined {
	const input = asControlInput(message)
	if(!input || (options.channel !== undefined && input.channel !== options.channel))
		return undefined

	const event = resolveBinding(toSource(input), options.bindings)
	return event && decodeControlValue(event, input.value)
}
