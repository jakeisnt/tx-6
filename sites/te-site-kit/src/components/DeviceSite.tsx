import { DeviceProvider } from '@ulnd/teenage/react'
import { webBluetooth } from '@ulnd/teenage/web-bluetooth'
import { webMidi } from '@ulnd/teenage/web-midi'
import { type ReactNode, useEffect, useState } from 'react'

import { type AnyDevice, useConnection, useDevice, useDeviceEvent } from '../device.ts'
import { cn } from '../lib/cn.ts'
import { describeEvent } from '../lib/describe.ts'
import { PairingProvider, persistBindings } from '../lib/pairing.tsx'
import { SITES, type SiteId, siteUrl } from '../sites.ts'
import MidiLog from './MidiLog.tsx'
import classes from './site.module.scss'

const hasBluetooth = typeof navigator !== 'undefined' && 'bluetooth' in navigator
const hasMidi = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator

/** Links to the other device sites. */
function SiteNav({ current }: { current: SiteId }) {
	return (
		<nav className={classes.nav} aria-label="devices">
			{SITES.map(site => site.id === current
				? <span key={site.id} className={cn(classes.navItem, classes.navCurrent)} aria-current="page">{site.name}</span>
				: <a key={site.id} className={classes.navItem} href={siteUrl(site, import.meta.env.DEV)} title={`teenage engineering ${site.name} ${site.kind}`}>{site.name}</a>)}
		</nav>
	)
}

function Toolbar({ setup }: { setup: ReactNode }) {
	const device = useDevice()
	const { status, error, disconnect } = useConnection()
	const [last, setLast] = useState<string>()
	const { name } = device.profile

	useDeviceEvent('event', event => setLast(describeEvent(event)), device)

	const connect = (transport: 'bluetooth' | 'midi') => {
		// Failures land in `error`
		device.connect(transport === 'bluetooth' ? webBluetooth(device.profile) : webMidi(device.profile)).catch(() => {})
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
					This browser has no Web Bluetooth. Use Chrome or Edge, or pair the {name} with your OS and use midi.
				</span>
			)}
			{error !== undefined && status === 'disconnected' && (
				<span className={classes.error}>{error instanceof Error ? error.message : String(error)}</span>
			)}
			{status === 'disconnected' && (
				<details className={classes.setup}>
					<summary>put the {name} in midi mode</summary>
					{setup}
				</details>
			)}
		</header>
	)
}

/**
 * A device site: links to the other sites, a toolbar to connect, the device
 * drawing (`children`), and the MIDI log with pairing. Pairings are saved per device.
 */
export default function DeviceSite({ site, device, setup, children }: { site: SiteId, device: AnyDevice, setup: ReactNode, children?: ReactNode }) {
	useEffect(() => persistBindings(device), [device])

	return (
		<DeviceProvider device={device}>
			<PairingProvider>
				<main className={classes.page}>
					<SiteNav current={site} />
					<Toolbar setup={setup} />
					<div className={classes.stage}>
						{children}
					</div>
					<MidiLog />
				</main>
			</PairingProvider>
		</DeviceProvider>
	)
}
