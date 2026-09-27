import {
	type ControlBindings,
	type ControlEvent,
	type ControlKind,
	type ControlKinds,
	type ControlMap,
	type ControlName,
	type ControlSource,
	decodeKind,
	toSource
} from './controls.js'
import { asControlInput, type ControlChange, type MidiMessage } from './midi.js'
import type { TransportTarget } from './transport.js'

export interface DeviceDefinition<K extends ControlKinds> extends TransportTarget {
	/** Controller number → control, as the device sends them by default. */
	controllers: ControlMap<K>
	/**
	 * Note number → control, for devices that send some controls as notes.
	 * Defaults to none, so notes only decode once they're paired.
	 */
	notes?: ControlMap<K>
}

export interface DecodeOptions<C extends string = string> {
	/** Only accept messages on this MIDI channel (0–15). */
	channel?: number
	/** Custom pairings, applied over the default map. */
	bindings?: ControlBindings<C>
}

/**
 * Everything the shared driver needs to know about one device, plus the
 * decoders derived from its control map. Built with {@link defineDevice}.
 */
export interface DeviceProfile<K extends ControlKinds> extends DeviceDefinition<K> {
	/** Every control, in controller map order. */
	readonly controls: readonly ControlName<K>[]
	kindOf(control: ControlName<K>): ControlKind
	isControl(value: unknown): value is ControlName<K>
	/** The controller number a control sends by default, if any. */
	controllerFor(control: ControlName<K>): number | undefined
	/** The control a source maps to by default. */
	defaultBinding(source: ControlSource): ControlName<K> | undefined
	/** Resolve a source to a control, honouring custom `bindings` first. */
	resolveBinding(source: ControlSource, bindings?: ControlBindings<ControlName<K>>): ControlName<K> | undefined
	/** Decode a 7-bit value for a given control into its event payload. */
	decodeControlValue(control: ControlName<K>, value: number): ControlEvent<K> | undefined
	/** Decode a Control Change into a control event, using the default map. */
	decodeControlChange(change: ControlChange): ControlEvent<K> | undefined
	/** Decode a Control Change, Note On or Note Off into a control event, if it maps to one. */
	decodeMidiMessage(message: MidiMessage, options?: DecodeOptions<ControlName<K>>): ControlEvent<K> | undefined
}

/** Names of the events every device emits besides its controls. */
const RESERVED = new Set(['event', 'message', 'packet', 'bindings', 'status', 'error', 'change'])

/** Build a {@link DeviceProfile} from a device's control map. */
export function defineDevice<K extends ControlKinds>(definition: DeviceDefinition<K>): DeviceProfile<K> {
	const { controllers, notes = new Map() } = definition
	const kinds = new Map<string, ControlKind>([...controllers.values(), ...notes.values()].map(control => [control.event, control.kind]))
	for(const control of kinds.keys())
		if(RESERVED.has(control))
			throw new Error(`${definition.name}: "${control}" is reserved for a device event; rename the control`)

	const controllerOf = new Map<string, number>()
	for(const [controller, { event }] of controllers)
		if(!controllerOf.has(event))
			controllerOf.set(event, controller)

	type C = ControlName<K>

	const profile: DeviceProfile<K> = {
		...definition,
		notes,
		controls: [...kinds.keys()] as C[],
		kindOf: control => kinds.get(control)!,
		isControl: (value): value is C => typeof value === 'string' && kinds.has(value),
		controllerFor: control => controllerOf.get(control),

		defaultBinding(source) {
			const separator = source.indexOf(':')
			const map = source.slice(0, separator) === 'cc' ? controllers : notes
			return map.get(Number(source.slice(separator + 1)))?.event
		},

		resolveBinding(source, bindings) {
			if(bindings && Object.hasOwn(bindings, source))
				return bindings[source] ?? undefined

			return profile.defaultBinding(source)
		},

		decodeControlValue(control, value) {
			const kind = kinds.get(control)
			const parameters = kind && decodeKind(kind, value)
			return parameters && { event: control, ...parameters } as unknown as ControlEvent<K>
		},

		decodeControlChange({ controller, value }) {
			const control = controllers.get(controller)
			return control && profile.decodeControlValue(control.event, value)
		},

		decodeMidiMessage(message, options = {}) {
			const input = asControlInput(message)
			if(!input || (options.channel !== undefined && input.channel !== options.channel))
				return undefined

			const control = profile.resolveBinding(toSource(input), options.bindings)
			return control && profile.decodeControlValue(control, input.value)
		}
	}

	return profile
}
