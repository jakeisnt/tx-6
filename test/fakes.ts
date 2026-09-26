import type { TX6Transport, TX6TransportSink } from '../src/index.ts'

export function fakeTransport(options: { fail?: unknown } = {}) {
	let sink: TX6TransportSink | undefined
	let resolveConnect: (() => void) | undefined

	const transport = {
		connects: 0,
		disconnects: 0,
		/** When true, connect() waits for release() before resolving. */
		hold: false,
		async connect(s: TX6TransportSink) {
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
	} satisfies TX6Transport & Record<string, unknown>

	return transport
}
