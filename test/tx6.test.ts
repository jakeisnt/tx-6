import { describe, expect, mock, test } from 'bun:test'

import { TX6 } from '../src/index.ts'
import { fakeTransport } from './fakes.ts'

describe('TX6', () => {
	test('connects, receives and disconnects', async () => {
		const transport = fakeTransport()
		const tx6 = new TX6({ transport })
		const statuses: string[] = []
		tx6.on('status', status => statuses.push(status))

		await tx6.connect()
		expect(tx6.status).toBe('connected')

		const onSlider = mock()
		const onAny = mock()
		tx6.on('input1.slider', onSlider)
		tx6.on('event', onAny)

		transport.send(0xb0, 1, 127)
		expect(onSlider).toHaveBeenCalledWith({ progress: 1, value: 127 })
		expect(onAny).toHaveBeenCalledWith({ event: 'input1.slider', progress: 1, value: 127 })
		expect(tx6.getValue('input1.slider')).toEqual({ progress: 1, value: 127 })

		await tx6.disconnect()
		expect(transport.disconnects).toBe(1)
		expect(statuses).toEqual(['connecting', 'connected', 'disconnected'])

		// Messages from a closed connection are ignored
		transport.send(0xb0, 1, 127)
		expect(onSlider).toHaveBeenCalledTimes(1)
	})

	test('ignores messages that are not TX-6 controls', () => {
		const tx6 = new TX6()
		const onAny = mock()
		const onMessage = mock()
		tx6.on('event', onAny)
		tx6.on('message', onMessage)

		tx6.receive([0x90, 60, 100])
		tx6.receive([0xb0, 99, 1])
		tx6.receive([])
		tx6.receive([0x12])

		expect(onMessage).toHaveBeenCalledTimes(2)
		expect(onAny).not.toHaveBeenCalled()
	})

	test('records connection errors', async () => {
		const failure = new Error('nope')
		const tx6 = new TX6({ transport: fakeTransport({ fail: failure }) })
		const onError = mock()
		tx6.on('error', onError)

		await expect(tx6.connect()).rejects.toBe(failure)
		expect(tx6.status).toBe('disconnected')
		expect(tx6.error).toBe(failure)
		expect(onError).toHaveBeenCalledWith(failure)
	})

	test('rejects without a transport', async () => {
		await expect(new TX6().connect()).rejects.toThrow('No transport')
	})

	test('concurrent connects share one attempt', async () => {
		const transport = fakeTransport()
		transport.hold = true
		const tx6 = new TX6({ transport })

		const a = tx6.connect()
		const b = tx6.connect()
		expect(a).toBe(b)
		transport.release()
		await a
		expect(transport.connects).toBe(1)
		await tx6.connect()
		expect(transport.connects).toBe(1)
	})

	test('disconnect during connect cancels it', async () => {
		const transport = fakeTransport()
		transport.hold = true
		const tx6 = new TX6({ transport })

		const attempt = tx6.connect()
		await tx6.disconnect()
		expect(tx6.status).toBe('disconnected')
		transport.release()
		await expect(attempt).rejects.toThrow('cancelled')
		expect(tx6.status).toBe('disconnected')
		expect(transport.disconnects).toBe(2)

		// And a fresh connect works afterwards
		transport.hold = false
		await tx6.connect()
		expect(tx6.status).toBe('connected')
	})

	test('handles unexpected disconnects', async () => {
		const transport = fakeTransport()
		const tx6 = new TX6({ transport })
		await tx6.connect()

		const lost = new Error('lost')
		transport.drop(lost)
		expect(tx6.status).toBe('disconnected')
		expect(tx6.error).toBe(lost)

		await tx6.connect()
		expect(tx6.status).toBe('connected')
		expect(tx6.error).toBeUndefined()
	})

	test('channel filter', () => {
		const tx6 = new TX6({ channel: 2 })
		tx6.receive([0xb0, 25, 127])
		expect(tx6.getValue('input1.button')).toBeUndefined()
		tx6.receive([0xb2, 25, 127])
		expect(tx6.getValue('input1.button')).toEqual({ pressed: true, value: 127 })
	})

	test('a throwing listener does not block others', () => {
		const tx6 = new TX6()
		const after = mock()
		const reported = mock()
		const original = globalThis.reportError
		globalThis.reportError = reported

		tx6.on('fx1', () => {
			throw new Error('boom')
		})
		tx6.on('fx1', after)
		tx6.receive([0xb0, 33, 127])
		globalThis.reportError = original

		expect(after).toHaveBeenCalled()
		expect(reported).toHaveBeenCalledWith(new Error('boom'))
	})

	test('subscribe fires on changes and unsubscribes', async () => {
		const tx6 = new TX6({ transport: fakeTransport() })
		const listener = mock()
		const unsubscribe = tx6.subscribe(listener)

		await tx6.connect()
		tx6.receive([0xb0, 7, 64])
		const calls = listener.mock.calls.length
		expect(calls).toBeGreaterThanOrEqual(3)

		unsubscribe()
		tx6.receive([0xb0, 7, 65])
		expect(listener).toHaveBeenCalledTimes(calls)
	})

	test('reports what each message decoded to, and where it came from', async () => {
		const transport = fakeTransport()
		const tx6 = new TX6({ transport })
		const onMessage = mock()
		tx6.on('message', onMessage)
		await tx6.connect()

		transport.send(0xb0, 25, 127)
		expect(onMessage).toHaveBeenLastCalledWith(
			{ status: 0xb0, data: [25, 127] },
			{ origin: 'device', source: 'cc:25', event: { event: 'input1.button', pressed: true, value: 127 } }
		)

		tx6.receive([0x90, 60, 1])
		expect(onMessage).toHaveBeenLastCalledWith({ status: 0x90, data: [60, 1] }, { origin: 'local', source: 'note:60', event: undefined })

		tx6.receive([0xf8])
		expect(onMessage).toHaveBeenLastCalledWith({ status: 0xf8, data: [] }, { origin: 'local', source: undefined, event: undefined })
	})

	test('bindings', () => {
		const tx6 = new TX6({ bindings: { 'cc:74': 'input2.eq1' } })
		const onBindings = mock()
		tx6.on('bindings', onBindings)

		tx6.receive([0xb0, 74, 127])
		expect(tx6.getValue('input2.eq1')).toEqual({ progress: 1, value: 127 })

		tx6.bind('note:40', 'shift')
		expect(onBindings).toHaveBeenLastCalledWith({ 'cc:74': 'input2.eq1', 'note:40': 'shift' })
		tx6.receive([0x90, 40, 127])
		expect(tx6.getValue('shift')).toMatchObject({ pressed: true })

		tx6.bind('cc:1', null)
		expect(tx6.resolve('cc:1')).toBeUndefined()
		tx6.unbind('cc:1')
		expect(tx6.resolve('cc:1')).toBe('input1.slider')

		tx6.setBindings({})
		expect(tx6.bindings).toEqual({})
		expect(tx6.resolve('cc:74')).toBeUndefined()
	})
})
