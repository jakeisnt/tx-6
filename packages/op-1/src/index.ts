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

import type { OP1ControlKinds } from './controls.js'
import { op1Profile } from './profile.js'

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
export { OP1, type OP1Options } from './op1.js'
export { op1Profile } from './profile.js'

export type OP1EventType = keyof OP1ControlKinds
export type OP1EventParameters<E extends OP1EventType = OP1EventType> = ControlParameters<OP1ControlKinds, E>
/** A decoded OP-1 field control event, discriminated on `event`. */
export type OP1Event = ControlEvent<OP1ControlKinds>
export type OP1RangeParameters = RangeParameters
export type OP1ButtonParameters = ButtonParameters
export type OP1EncoderParameters = EncoderParameters
export type OP1Source = ControlSource
export type OP1Bindings = ControlBindings<OP1EventType>
export type OP1DecodeOptions = DecodeOptions<OP1EventType>
export type OP1Events = TEDeviceEvents<OP1ControlKinds>
export type OP1MessageInfo = MessageInfo<OP1ControlKinds>
export type OP1MessageOrigin = MessageOrigin
export type OP1ConnectionStatus = ConnectionStatus
export type OP1ConnectionState = ConnectionState
export type OP1Transport = TEDeviceTransport
export type OP1TransportSink = TEDeviceTransportSink

export const OP1_EVENT_TYPES: readonly OP1EventType[] = op1Profile.controls
export const isOP1EventType: (value: unknown) => value is OP1EventType = op1Profile.isControl
export const isOP1Source: (value: unknown) => value is OP1Source = isControlSource
export const defaultBinding: (source: OP1Source) => OP1EventType | undefined = op1Profile.defaultBinding
export const resolveBinding: (source: OP1Source, bindings?: OP1Bindings) => OP1EventType | undefined = op1Profile.resolveBinding
export const decodeControlValue: (event: OP1EventType, value: number) => OP1Event | undefined = op1Profile.decodeControlValue
export const decodeControlChange: typeof op1Profile.decodeControlChange = op1Profile.decodeControlChange
export const decodeMidiMessage: typeof op1Profile.decodeMidiMessage = op1Profile.decodeMidiMessage
