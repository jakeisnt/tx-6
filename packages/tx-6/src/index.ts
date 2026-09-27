import type {
	ButtonParameters,
	ConnectionState,
	ConnectionStatus,
	ControlBindings,
	ControlEvent,
	ControlParameters,
	ControlSource,
	DecodeOptions,
	EncoderParameters,
	KindParameters,
	MessageInfo,
	MessageOrigin,
	RangeParameters,
	TEDeviceEvents,
	TEDeviceTransport,
	TEDeviceTransportSink
} from '@ulnd/te-device'
import { isControlSource } from '@ulnd/te-device'

import type { TX6ControlKinds } from './controls.js'
import { tx6Profile } from './profile.js'

export {
	asControlChange,
	asControlInput,
	BLE_MIDI_CHARACTERISTIC_UUID,
	BLE_MIDI_SERVICE_UUID,
	type ControlChange,
	type ControlInput,
	dataLength,
	Emitter,
	type MidiMessage,
	parseBLEMidiPacket,
	toMidiMessage,
	toSource
} from '@ulnd/te-device'
export {
	INPUTS,
	TX6_CONTROLLERS,
	type TX6ButtonEvent,
	type TX6ControlKinds,
	type TX6EncoderEvent,
	type TX6EqEvent,
	type TX6Input,
	type TX6SliderEvent
} from './controls.js'
export { tx6Profile } from './profile.js'
export { TX6, type TX6Options } from './tx6.js'

export type TX6EventType = keyof TX6ControlKinds
export type TX6EventParameterMap = { [C in TX6EventType]: KindParameters[TX6ControlKinds[C]] }
export type TX6EventParameters<E extends TX6EventType = TX6EventType> = ControlParameters<TX6ControlKinds, E>
/** A decoded TX-6 control event, discriminated on `event`. */
export type TX6Event = ControlEvent<TX6ControlKinds>
export type TX6RangeParameters = RangeParameters
export type TX6ButtonParameters = ButtonParameters
export type TX6EncoderParameters = EncoderParameters
export type TX6Source = ControlSource
export type TX6Bindings = ControlBindings<TX6EventType>
export type TX6DecodeOptions = DecodeOptions<TX6EventType>
export type TX6Events = TEDeviceEvents<TX6ControlKinds>
export type TX6MessageInfo = MessageInfo<TX6ControlKinds>
export type TX6MessageOrigin = MessageOrigin
export type TX6ConnectionStatus = ConnectionStatus
export type TX6ConnectionState = ConnectionState
export type TX6Transport = TEDeviceTransport
export type TX6TransportSink = TEDeviceTransportSink

export const TX6_EVENT_TYPES: readonly TX6EventType[] = tx6Profile.controls
export const isTX6EventType: (value: unknown) => value is TX6EventType = tx6Profile.isControl
export const isTX6Source: (value: unknown) => value is TX6Source = isControlSource
export const defaultBinding: (source: TX6Source) => TX6EventType | undefined = tx6Profile.defaultBinding
export const resolveBinding: (source: TX6Source, bindings?: TX6Bindings) => TX6EventType | undefined = tx6Profile.resolveBinding
export const decodeControlValue: (event: TX6EventType, value: number) => TX6Event | undefined = tx6Profile.decodeControlValue
export const decodeControlChange: typeof tx6Profile.decodeControlChange = tx6Profile.decodeControlChange
export const decodeMidiMessage: typeof tx6Profile.decodeMidiMessage = tx6Profile.decodeMidiMessage
