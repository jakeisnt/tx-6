import { afterAll, beforeAll, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

import { TX6 } from '@ulnd/tx-6'
import { fakeTransport } from '../../../te-device/test/fakes.ts'

// react-dom checks for a DOM when it's first imported, so load it after registering one
GlobalRegistrator.register()
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { TX6Provider, useTX6, useTX6Attribute, useTX6Attributes } = await import('../src/index.ts')

declare global {
	var IS_REACT_ACT_ENVIRONMENT: boolean
}

beforeAll(() => {
	document.body.innerHTML = '<div id="root"></div>'
})

afterAll(async () => {
	await GlobalRegistrator.unregister()
})

function App() {
	const { status, connect } = useTX6()
	const { progress } = useTX6Attribute('input1.slider')
	const [eq1, eq2] = useTX6Attributes(['input1.eq1', 'input1.eq2'])

	return (
		<>
			<button type="button" onClick={connect}>{status}</button>
			<span id="slider">{progress ?? 'none'}</span>
			<span id="eq">{`${eq1.value ?? '-'},${eq2.value ?? '-'}`}</span>
		</>
	)
}

test('hooks track connection state and control values', async () => {
	const transport = fakeTransport()
	const device = new TX6({ transport })
	const root = createRoot(document.getElementById('root')!)

	await act(async () => root.render(<TX6Provider device={device}><App /></TX6Provider>))

	const button = document.querySelector('button')!
	const text = (selector: string) => document.querySelector(selector)!.textContent

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
