import type { ControlSource, MessageOrigin, MidiMessage } from '@ulnd/te-device'
import { useEffect, useRef, useState } from 'react'

import { type AnyDevice, useConnection, useDevice } from '../device.ts'
import { cn } from '../lib/cn.ts'
import { describeEvent } from '../lib/describe.ts'
import { usePairing } from '../lib/pairing.tsx'
import classes from './midi-log.module.scss'

const MAX_ENTRIES = 300

interface LoggedMessage {
	bytes: string
	description: string
	source?: ControlSource
	event?: string
}

interface Entry {
	id: number
	time: string
	origin: MessageOrigin
	/** Raw transport bytes (one BLE-MIDI packet), when the transport reports them. */
	packet?: string
	messages: LoggedMessage[]
}

const hex = (bytes: ArrayLike<number>) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(' ')

const STATUS_NAMES: Record<number, string> = {
	128: 'note off',
	144: 'note on',
	160: 'poly pressure',
	176: 'cc',
	192: 'program',
	208: 'pressure',
	224: 'pitch bend'
}

function describeMessage({ status, data }: MidiMessage) {
	if(status < 0xf0)
		return `${STATUS_NAMES[status & 0xf0]} ch${(status & 0x0f) + 1} ${data.join(' ')}`

	return { 248: 'clock', 250: 'start', 251: 'continue', 252: 'stop', 254: 'active sensing', 255: 'reset' }[status] ?? `system ${status.toString(16)}`
}

function time() {
	const now = new Date()
	return `${now.toLocaleTimeString([], { hour12: false })}.${String(now.getMilliseconds()).padStart(3, '0')}`
}

/** Collect raw packets and the messages parsed from them, batched to one render per frame. */
function useLog(device: AnyDevice, { paused, includeLocal }: { paused: boolean, includeLocal: boolean }) {
	const [entries, setEntries] = useState<Entry[]>([])
	const pending = useRef<Entry[]>([])
	const frame = useRef(0)
	const nextId = useRef(0)

	useEffect(() => {
		if(paused)
			return

		// The entry for the packet currently being parsed; messages from it attach here
		let open: Entry | undefined

		const flush = () => {
			frame.current = 0
			const batch = pending.current
			pending.current = []
			setEntries(current => [...batch.reverse(), ...current].slice(0, MAX_ENTRIES))
		}

		const push = (entry: Entry) => {
			pending.current.push(entry)
			frame.current ||= requestAnimationFrame(flush)
		}

		const offPacket = device.on('packet', bytes => {
			open = { id: nextId.current++, time: time(), origin: 'device', packet: hex(bytes), messages: [] }
			push(open)
			// Transports deliver a packet's messages synchronously right after it
			queueMicrotask(() => {
				open = undefined
			})
		})

		const offMessage = device.on('message', (message, { origin, source, event }) => {
			if(origin === 'local' && !includeLocal)
				return

			const logged: LoggedMessage = {
				bytes: hex([message.status, ...message.data]),
				description: describeMessage(message),
				source,
				event: event && describeEvent(event)
			}

			if(origin === 'device' && open) {
				open.messages.push(logged)
				return
			}

			push({ id: nextId.current++, time: time(), origin, messages: [logged] })
		})

		return () => {
			offPacket()
			offMessage()
			cancelAnimationFrame(frame.current)
			frame.current = 0
			pending.current = []
		}
	}, [device, paused, includeLocal])

	return [entries, setEntries] as const
}

function Pairings() {
	const device = useDevice()
	const { learning, setLearning, armed, arm } = usePairing()
	const [bindings, setBindings] = useState(device.bindings)

	useEffect(() => device.on('bindings', setBindings), [device])

	const custom = Object.entries(bindings) as [ControlSource, string | null][]

	return (
		<section className={classes.pairing}>
			<div className={classes.row}>
				<button type="button" className={cn(classes.chip, learning && classes.chipOn)} onClick={() => setLearning(!learning)}>
					{learning ? 'done pairing' : 'pair controls'}
				</button>
				{learning && (
					<select
						className={classes.select}
						value={armed ?? ''}
						onChange={change => arm(change.target.value || null)}
						aria-label="control to pair"
					>
						<option value="">choose a control…</option>
						{device.profile.controls.map(event => <option key={event} value={event}>{event}</option>)}
					</select>
				)}
			</div>

			{learning && (
				<p className={classes.hint}>
					{armed
						? <>Move <b>{armed}</b> on the {device.profile.name}. The first CC or note it sends is paired to it.</>
						: `Click a control on the drawing (or choose one above), then move it on the ${device.profile.name}.`}
				</p>
			)}

			{custom.length > 0 && (
				<ul className={classes.bindings}>
					{custom.map(([source, event]) => (
						<li key={source}>
							<code>{source}</code> → {event ?? <i>ignored</i>}
							<button type="button" className={classes.remove} aria-label={`unpair ${source}`} onClick={() => device.unbind(source)}>×</button>
						</li>
					))}
					<li>
						<button type="button" className={classes.link} onClick={() => device.setBindings({})}>reset to defaults</button>
					</li>
				</ul>
			)}
		</section>
	)
}

/** Raw BLE-MIDI packets, the messages parsed from them, and what each one moved. */
export default function MidiLog() {
	const device = useDevice()
	const { status } = useConnection()
	const [paused, setPaused] = useState(false)
	const [includeLocal, setIncludeLocal] = useState(false)
	const [entries, setEntries] = useLog(device, { paused, includeLocal })
	const [copied, setCopied] = useState(false)

	const copy = () => {
		const text = [...entries].reverse().map(entry => [
			`${entry.time} ${entry.origin}${entry.packet ? ` [${entry.packet}]` : ''}`,
			...entry.messages.map(message => `  ${message.bytes}  ${message.description}  ${message.source ?? ''} → ${message.event ?? 'unmapped'}`)
		].join('\n')).join('\n')

		navigator.clipboard?.writeText(text).then(() => {
			setCopied(true)
			setTimeout(() => setCopied(false), 1200)
		}, () => {})
	}

	return (
		// Collapsed by default; it stays mounted so the log keeps recording while closed
		<details className={classes.drawer}>
			<summary className={classes.summary}>
				midi log &amp; pairing
				{entries.length > 0 && <span className={classes.count}>{entries.length}</span>}
			</summary>

			<div className={classes.panel}>
				<Pairings />

				<header className={classes.header}>
					<h2 className={classes.title}>midi log</h2>
					<label className={classes.toggle}>
						<input type="checkbox" checked={includeLocal} onChange={change => setIncludeLocal(change.target.checked)} />
						on-screen
					</label>
					<button type="button" className={classes.chip} onClick={() => setPaused(!paused)}>{paused ? 'resume' : 'pause'}</button>
					<button type="button" className={classes.chip} onClick={copy} disabled={entries.length === 0}>{copied ? 'copied' : 'copy'}</button>
					<button type="button" className={classes.chip} onClick={() => setEntries([])} disabled={entries.length === 0}>clear</button>
				</header>

				<ol className={classes.log}>
					{entries.length === 0 && (
						<li className={classes.empty}>
							{status === 'connected' ? `Waiting for the ${device.profile.name}… move a control or press a button.` : `Connect a ${device.profile.name} to see raw packets here.`}
						</li>
					)}
					{entries.map(entry => (
						<li key={`${entry.origin}-${entry.id}`} className={cn(classes.entry, entry.origin === 'local' && classes.local)}>
							<div className={classes.meta}>
								<span>{entry.time}</span>
								{entry.packet !== undefined
									? <code className={classes.packet}>{entry.packet}</code>
									: <span>{entry.origin === 'local' ? 'on-screen' : 'midi'}</span>}
							</div>
							{entry.messages.length === 0 && <div className={classes.message}><span className={classes.unmapped}>no complete MIDI messages in packet</span></div>}
							{entry.messages.map((message, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: messages within a packet never reorder
								<div key={index} className={classes.message}>
									<code>{message.bytes}</code>
									<span>{message.description}</span>
									<span className={message.event ? classes.mapped : classes.unmapped}>{message.event ?? (message.source ? `${message.source} unmapped` : 'ignored')}</span>
								</div>
							))}
						</li>
					))}
				</ol>
			</div>
		</details>
	)
}
