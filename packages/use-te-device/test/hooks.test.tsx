import { afterAll, beforeAll, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { OP1 } from '@ulnd/op-1'
import { TX6 } from '@ulnd/tx-6'

import { fakeTransport } from '../../te-device/test/fakes.ts'

// react-dom checks for a DOM when it's first imported, so load it after registering one
GlobalRegistrator.register()
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { DeviceProvider, useConnection, useControl, useControls, useDevice, useDeviceEvent } = await import('../src/index.tsx')

declare global {
	var IS_REACT_ACT_ENVIRONMENT: boolean
}

beforeAll(() => {
	document.body.innerHTML = '<div id="root"></div>'
})

afterAll(async () => {
	await GlobalRegistrator.unregister()
})

const text = (selector: string) => document.querySelector(selector)!.textContent

async function render(element: React.ReactNode) {
	const root = createRoot(document.getElementById('root')!)
	await act(async () => root.render(element))
	return root
}

test('hooks read the provided device and track connection state and control values', async () => {
	const transport = fakeTransport()
	const device = new TX6({ transport })

	function App() {
		const { status, connect } = useConnection<TX6>()
		const { progress } = useControl<TX6>('input1.slider')
		const [eq1, eq2] = useControls(['input1.eq1', 'input1.eq2'], useDevice<TX6>())

		return (
			<>
				<button type="button" onClick={connect}>{status}</button>
				<span id="slider">{progress ?? 'none'}</span>
				<span id="eq">{`${eq1.value ?? '-'},${eq2.value ?? '-'}`}</span>
			</>
		)
	}

	const root = await render(<DeviceProvider device={device}><App /></DeviceProvider>)
	const button = document.querySelector('button')!

	expect(button.textContent).toBe('disconnected')
	expect(text('#slider')).toBe('none')
	expect(text('#eq')).toBe('-,-')

	// Clicking passes a MouseEvent to connect; it must not be mistaken for a transport
	await act(async () => button.click())
	expect(button.textContent).toBe('connected')

	await act(async () => {
		transport.send(0xb0, 1, 127)
		transport.send(0xb0, 8, 10)
		transport.send(0xb0, 13, 20)
	})
	expect(text('#slider')).toBe('1')
	// input2.eq1 (cc 8) must not leak into input1.eq1
	expect(text('#eq')).toBe('-,20')

	await act(async () => transport.drop(new Error('gone')))
	expect(button.textContent).toBe('disconnected')

	await act(async () => root.unmount())
})

test('a device passed as an argument needs no provider, and wins over one', async () => {
	const provided = new TX6()
	const op1 = new OP1()
	const turns: number[] = []

	function App() {
		const { pressed } = useControl('play', op1)
		useDeviceEvent('blue.encoder', ({ delta }) => turns.push(delta), op1)
		return <span id="play">{pressed === undefined ? 'none' : String(pressed)}</span>
	}

	const root = await render(<DeviceProvider device={provided}><App /></DeviceProvider>)
	expect(text('#play')).toBe('none')

	await act(async () => {
		op1.receive([0xb0, 39, 127])
		op1.receive([0xb0, 1, 127])
		provided.receive([0xb0, 39, 127])
	})
	expect(text('#play')).toBe('true')
	expect(turns).toEqual([-1])

	await act(async () => root.unmount())

	// Unsubscribed on unmount
	op1.receive([0xb0, 1, 1])
	expect(turns).toEqual([-1])
})

test('useDevice throws without a device', async () => {
	let caught: unknown
	function App() {
		try {
			// biome-ignore lint/correctness/useHookAtTopLevel: catching the hook's own error is the point
			useDevice()
		} catch(error) {
			caught = error
		}
		return null
	}

	const root = await render(<App />)
	expect(String(caught)).toContain('No device')
	await act(async () => root.unmount())
})

// Type-level checks: these only need to compile
export function useTypeChecks(tx6: TX6) {
	// Passing the device types the payload exactly
	const { progress } = useControl('input1.slider', tx6)
	progress satisfies number | undefined
	// @ts-expect-error a slider has no `pressed`
	useControl('input1.slider', tx6).pressed

	// A type argument checks the name and offers every field the control could have
	const { pressed } = useControl<TX6>('fx1')
	pressed satisfies boolean | undefined
	// @ts-expect-error not a TX-6 control
	useControl<TX6>('blue.encoder')
	// @ts-expect-error not a TX-6 control
	useControl('input9.slider', tx6)

	useDeviceEvent('select.encoder', ({ delta }) => delta satisfies number, tx6)
	useDeviceEvent('status', status => status satisfies 'disconnected' | 'connecting' | 'connected', tx6)
}
