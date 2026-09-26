import { useEffect, useMemo, useState } from 'react'
import { TX6, type TX6Event } from 'use-tx-6'
import { TX6Provider, useTX6, useTX6Device } from 'use-tx-6/react'
import { webBluetooth } from 'use-tx-6/web-bluetooth'
import { webMidi } from 'use-tx-6/web-midi'
import classes from './app.module.scss'
import Device from './components/Device.tsx'
import MidiLog from './components/MidiLog.tsx'
import { cn } from './lib/cn.ts'
import { loadBindings, PairingProvider, persistBindings } from './lib/pairing.tsx'

const hasBluetooth = typeof navigator !== 'undefined' && 'bluetooth' in navigator
const hasMidi = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator

function format(event: TX6Event) {
	if('progress' in event)
		return `${event.event} ${event.progress.toFixed(2)}`
	if('pressed' in event)
		return `${event.event} ${event.pressed ? 'down' : 'up'}`
	return `${event.event} ${event.delta > 0 ? '+' : ''}${event.delta}`
}

function Setup() {
	return (
		<details className={classes.setup} open>
			<summary>put the TX-6 in midi mode</summary>
			<ol>
				<li>open the <b>system menu</b> and go to <b>midi</b>.</li>
				<li>turn the select encoder to <b>CTRL</b> and tap select until it reads <b>OUT</b>, so knobs, faders and buttons send midi cc.</li>
				<li>press <b>shift</b> to exit. the <b>TX</b> marker on the display flickers when you move a fader.</li>
			</ol>
			<p>
				<b>bluetooth:</b> bluetooth is off by default. in the system menu go to <b>ble</b>, pick <b>ACCEPT</b>, then click connect bluetooth and choose the TX-6.
				{' '}<b>usb:</b> plug in a usb-c cable and click midi.
			</p>
			<p>
				full midi reference in the{' '}
				<a href="https://github.com/jakeisnt/tx-6/blob/main/docs/midi.md" target="_blank" rel="noreferrer">docs</a>
				{' '}and teenage engineering's{' '}
				<a href="https://teenage.engineering/guides/tx-6" target="_blank" rel="noreferrer">TX-6 guide</a>.
			</p>
		</details>
	)
}

function Toolbar() {
	const device = useTX6Device()
	const { status, error, disconnect } = useTX6()
	const [last, setLast] = useState<string>()

	useEffect(() => device.on('event', event => setLast(format(event))), [device])

	const connect = (transport: 'bluetooth' | 'midi') => {
		// Failures land in `error`
		device.connect(transport === 'bluetooth' ? webBluetooth() : webMidi()).catch(() => {})
	}

	return (
		<header className={classes.bar}>
			<span className={classes.status}>
				<span className={cn(classes.led, status === 'connecting' && classes.ledConnecting, status === 'connected' && classes.ledConnected)} />
				{status}
			</span>

			<span className={classes.readout}>{last ?? 'drag, scroll or tab through the controls'}</span>

			<span className={classes.actions}>
				{status === 'disconnected'
					? (
						<>
							<button
								type="button"
								className={cn(classes.button, classes.primary)}
								disabled={!hasBluetooth}
								title={hasBluetooth ? undefined : 'Web Bluetooth needs Chrome or Edge'}
								onClick={() => connect('bluetooth')}
							>
								connect bluetooth
							</button>
							{hasMidi && (
								<button type="button" className={classes.button} onClick={() => connect('midi')}>
									midi
								</button>
							)}
						</>
					)
					: (
						<button type="button" className={classes.button} onClick={() => disconnect()}>
							disconnect
						</button>
					)}
			</span>

			{!hasBluetooth && status === 'disconnected' && (
				<span className={classes.error}>
					This browser has no Web Bluetooth. Use Chrome or Edge, or pair the TX-6 with your OS and use midi.
				</span>
			)}
			{error !== undefined && status === 'disconnected' && (
				<span className={classes.error}>{error instanceof Error ? error.message : String(error)}</span>
			)}
			{status === 'disconnected' && <Setup />}
		</header>
	)
}

export default function App() {
	const device = useMemo(() => new TX6({ transport: webBluetooth(), bindings: loadBindings() }), [])

	useEffect(() => persistBindings(device), [device])

	return (
		<TX6Provider device={device}>
			<PairingProvider>
				<main className={classes.page}>
					<Toolbar />
					<div className={classes.workspace}>
						<Device />
						<MidiLog />
					</div>
				</main>
			</PairingProvider>
		</TX6Provider>
	)
}
