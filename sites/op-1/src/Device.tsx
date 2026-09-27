import { Dial, describeEvent, Key, useConnection } from '@ulnd/te-site-kit'
import { useOP1Device } from '@ulnd/use-op-1'
import { useEffect, useState } from 'react'

import classes from './device.module.scss'
import Keyboard from './Keyboard.tsx'

const ENCODERS = [
	{ colour: 'blue', cap: '#2f6fd6' },
	{ colour: 'green', cap: '#2e9b52' },
	{ colour: 'white', cap: '#f1f1f2' },
	{ colour: 'orange', cap: '#fd6219' }
] as const

/** The OP-1 field, simplified: encoders, function keys and the keyboard. Every control is live. */
export default function Device() {
	const device = useOP1Device()
	const { status } = useConnection()
	const [last, setLast] = useState<string>()

	useEffect(() => device.on('event', event => setLast(describeEvent(event))), [device])

	return (
		<div className={classes.body}>
			<div className={classes.top}>
				<div className={classes.speaker} aria-hidden />
				<div className={classes.screen} aria-live="polite">
					<span className={classes.brand}>OP–1 field</span>
					<span>{status === 'connected' ? (last ?? 'ready') : status}</span>
				</div>
				<div className={classes.encoders}>
					{ENCODERS.map(({ colour, cap }) => (
						<Dial key={colour} control={`${colour}.encoder`} push={`${colour}.button`} colour={cap} size={64} />
					))}
				</div>
			</div>

			<div className={classes.keys}>
				<div className={classes.group}>
					<Key control="shift" tone="dark">shift</Key>
					<Key control="help">?</Key>
					<Key control="metronome">metro</Key>
				</div>
				<div className={classes.group}>
					<Key control="synth">synth</Key>
					<Key control="drum">drum</Key>
					<Key control="tape">tape</Key>
					<Key control="mixer">mixer</Key>
				</div>
				<div className={classes.group}>
					<Key control="t1">T1</Key>
					<Key control="t2">T2</Key>
					<Key control="t3">T3</Key>
					<Key control="t4">T4</Key>
				</div>
				<div className={classes.group}>
					<Key control="record" tone="orange">●</Key>
					<Key control="play">▶</Key>
					<Key control="stop">■</Key>
				</div>
			</div>

			<div className={classes.keys}>
				<div className={classes.group}>
					<Key control="left">◀</Key>
					<Key control="right">▶</Key>
					<Key control="up">▲</Key>
					<Key control="down">▼</Key>
				</div>
				<div className={classes.group}>
					<Key control="scissors">✂</Key>
					<Key control="sequencer">seq</Key>
					<Key control="mic">mic</Key>
					<Key control="com">com</Key>
				</div>
				<div className={classes.group}>
					{(['ss1', 'ss2', 'ss3', 'ss4', 'ss5', 'ss6', 'ss7', 'ss8'] as const).map((control, index) => (
						<Key key={control} control={control} tone="dark">{index + 1}</Key>
					))}
				</div>
			</div>

			<Keyboard />
		</div>
	)
}
