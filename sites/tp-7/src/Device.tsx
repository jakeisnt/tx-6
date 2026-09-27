import { Dial, describeEvent, Key, useConnection } from '@ulnd/te-site-kit'
import { useTP7Device } from '@ulnd/use-tp-7'
import { useEffect, useState } from 'react'

import classes from './device.module.scss'

/** The TP-7, simplified: the reel, the three side buttons and the transport. Every control is live. */
export default function Device() {
	const device = useTP7Device()
	const { status } = useConnection()
	const [last, setLast] = useState<string>()

	useEffect(() => device.on('event', event => setLast(describeEvent(event))), [device])

	return (
		<div className={classes.body}>
			<div className={classes.side}>
				<Key control="button1" tone="dark">1</Key>
				<Key control="button2" tone="dark">2</Key>
				<Key control="button3" tone="dark">3</Key>
			</div>

			<div className={classes.face}>
				<h1 className={classes.title}>TP–7</h1>
				<div className={classes.screen} aria-live="polite">
					<span>{status === 'connected' ? 'ready' : status}</span>
					<span>{last ?? '—'}</span>
				</div>
				<Dial control="reel" size={220} colour="#2b2a30" label="reel" />
				<div className={classes.transport}>
					<Key control="record" tone="orange">●</Key>
					<Key control="play">▶</Key>
					<Key control="stop">■</Key>
				</div>
			</div>
		</div>
	)
}
