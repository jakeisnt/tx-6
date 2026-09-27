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
	MessageInfo,
	MessageOrigin,
	RangeParameters,
	TEDeviceEvents,
	TEDeviceTransport,
	TEDeviceTransportSink
} from '@ulnd/te-device'
import { isControlSource } from '@ulnd/te-device'

import type { TP7ControlKinds } from './controls.js'
import { tp7 } from './profile.js'

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
export * from './controls.js'
export { tp7 } from './profile.js'
export { TP7, type TP7Options } from './tp7.js'

export type TP7EventType = keyof TP7ControlKinds
export type TP7EventParameters<E extends TP7EventType = TP7EventType> = ControlParameters<TP7ControlKinds, E>
/** A decoded TP-7 control event, discriminated on `event`. */
export type TP7Event = ControlEvent<TP7ControlKinds>
export type TP7RangeParameters = RangeParameters
export type TP7ButtonParameters = ButtonParameters
export type TP7EncoderParameters = EncoderParameters
export type TP7Source = ControlSource
export type TP7Bindings = ControlBindings<TP7EventType>
export type TP7DecodeOptions = DecodeOptions<TP7EventType>
export type TP7Events = TEDeviceEvents<TP7ControlKinds>
export type TP7MessageInfo = MessageInfo<TP7ControlKinds>
export type TP7MessageOrigin = MessageOrigin
export type TP7ConnectionStatus = ConnectionStatus
export type TP7ConnectionState = ConnectionState
export type TP7Transport = TEDeviceTransport
export type TP7TransportSink = TEDeviceTransportSink

export const TP7_EVENT_TYPES: readonly TP7EventType[] = tp7.controls
export const isTP7EventType: (value: unknown) => value is TP7EventType = tp7.isControl
export const isTP7Source: (value: unknown) => value is TP7Source = isControlSource
export const defaultBinding: (source: TP7Source) => TP7EventType | undefined = tp7.defaultBinding
export const resolveBinding: (source: TP7Source, bindings?: TP7Bindings) => TP7EventType | undefined = tp7.resolveBinding
export const decodeControlValue: (event: TP7EventType, value: number) => TP7Event | undefined = tp7.decodeControlValue
export const decodeControlChange: typeof tp7.decodeControlChange = tp7.decodeControlChange
export const decodeMidiMessage: typeof tp7.decodeMidiMessage = tp7.decodeMidiMessage
