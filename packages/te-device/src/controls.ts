import type { ControlInput } from './midi.js'

/**
 * How a control reads its 7-bit value:
 * - `slider` and `knob`: absolute position, 0–127.
 * - `button`: pressed at 64 and above.
 * - `encoder`: relative steps, two's complement (1..63 clockwise, 65..127 counter-clockwise).
 */
export type ControlKind = 'slider' | 'knob' | 'button' | 'encoder'

/** Payload for sliders and knobs. */
export interface RangeParameters {
	/** Normalised position, 0–1. */
	progress: number
	/** Raw 7-bit MIDI value, 0–127. */
	value: number
}

/** Payload for buttons. */
export interface ButtonParameters {
	pressed: boolean
	value: number
}

/** Payload for relative encoders. */
export interface EncoderParameters {
	direction: 'left' | 'right'
	/** Signed number of detents moved; positive is clockwise (right). */
	delta: number
	value: number
}

export interface KindParameters {
	slider: RangeParameters
	knob: RangeParameters
	button: ButtonParameters
	encoder: EncoderParameters
}

/** A device's controls: each control's name, and the kind of control it is. */
export type ControlKinds = { readonly [control: string]: ControlKind }

/** Every control name a device has. */
export type ControlName<K extends ControlKinds> = keyof K & string

/** Names of the controls of one kind. */
export type ControlsOfKind<K extends ControlKinds, Kind extends ControlKind> = { [C in ControlName<K>]: K[C] extends Kind ? C : never }[ControlName<K>]

/** The payload a control's events carry. */
export type ControlParameters<K extends ControlKinds, C extends ControlName<K> = ControlName<K>> = KindParameters[K[C]]

/** A decoded control event, discriminated on `event`. */
export type ControlEvent<K extends ControlKinds> = { [C in ControlName<K>]: { event: C } & KindParameters[K[C]] }[ControlName<K>]

/** One entry in a device's controller map. */
export type ControlDefinition<K extends ControlKinds> = { [C in ControlName<K>]: { event: C, kind: K[C] } }[ControlName<K>]

/** Controller (or note) number → the control it drives. */
export type ControlMap<K extends ControlKinds> = ReadonlyMap<number, ControlDefinition<K>>

/**
 * Identifies where a control's messages come from, independent of channel:
 * `cc:<controller>` or `note:<note number>`.
 */
export type ControlSource = `cc:${number}` | `note:${number}`

/**
 * Custom pairings of MIDI sources to controls. They take precedence over the
 * default map; `null` unpairs a source the default map would otherwise decode.
 */
export type ControlBindings<C extends string = string> = Readonly<Partial<Record<ControlSource, C | null>>>

export function toSource(input: Pick<ControlInput, 'type' | 'number'>): ControlSource {
	return `${input.type}:${input.number}`
}

export function isControlSource(value: unknown): value is ControlSource {
	return typeof value === 'string' && /^(cc|note):(\d|[1-9]\d|1[01]\d|12[0-7])$/.test(value)
}

/** Decode a 7-bit value for a control of the given kind. `undefined` for encoder values that don't move. */
export function decodeKind(kind: ControlKind, value: number): RangeParameters | ButtonParameters | EncoderParameters | undefined {
	switch(kind) {
	case 'slider':
	case 'knob':
		return { progress: value / 127, value }
	case 'button':
		return { pressed: value >= 64, value }
	case 'encoder': {
		// Relative, two's complement: 1..63 clockwise, 65..127 counter-clockwise
		const delta = value < 64 ? value : value - 128
		if(delta === 0 || value === 64)
			return undefined

		return { direction: delta > 0 ? 'right' : 'left', delta, value }
	}
	}
}
