import { defineDevice, TEDevice, type TEDeviceOptions, type TEDeviceTransport, type TEDeviceTransportSink } from '../src/index.ts'

type TestControls = { fader: 'slider', knob: 'knob', pad: 'button', dial: 'encoder' }

/** A made-up device with one control of each kind, for testing the shared core. */
export const testDevice = defineDevice<TestControls>({
	name: 'Test-1',
	midiInputPattern: /test-?1/i,
	controllers: new Map([
		[1, { event: 'fader', kind: 'slider' }],
		[2, { event: 'knob', kind: 'knob' }],
		[3, { event: 'pad', kind: 'button' }],
		[4, { event: 'dial', kind: 'encoder' }]
	])
})

export class TestDevice extends TEDevice<TestControls> {
	constructor(options: TEDeviceOptions<TestControls> = {}) {
		super(testDevice, options)
	}
}

export function fakeTransport(options: { fail?: unknown } = {}) {
	let sink: TEDeviceTransportSink | undefined
	let resolveConnect: (() => void) | undefined

	const transport = {
		connects: 0,
		disconnects: 0,
		/** When true, connect() waits for release() before resolving. */
		hold: false,
		async connect(s: TEDeviceTransportSink) {
			transport.connects++
			if(options.fail)
				throw options.fail

			sink = s
			if(transport.hold)
				await new Promise<void>(resolve => {
					resolveConnect = resolve
				})
		},
		disconnect() {
			transport.disconnects++
		},
		release: () => resolveConnect?.(),
		send: (...bytes: number[]) => sink?.message(bytes),
		drop: (error?: unknown) => sink?.disconnected(error)
	} satisfies TEDeviceTransport & Record<string, unknown>

	return transport
}
