import { cn, startDrag } from '@ulnd/te-site-kit'
import type { OP1 } from '@ulnd/teenage'
import { useDevice } from '@ulnd/teenage/react'
import { type PointerEvent, useEffect, useState } from 'react'

import classes from './device.module.scss'

// Two octaves, F to E, as on the OP-1 field at its default octave. The keys send
// notes, which aren't mapped to controls: they show in the midi log, and light
// here whenever the device (or a click) plays them.
const LOWEST = 53
const KEYS = Array.from({ length: 24 }, (_, index) => LOWEST + index)
const isBlack = (note: number) => [1, 3, 6, 8, 10].includes(note % 12)

function useHeldNotes() {
	const device = useDevice<OP1>()
	const [held, setHeld] = useState<ReadonlySet<number>>(new Set())

	useEffect(() => device.on('message', ({ status, data }) => {
		const type = status & 0xf0
		if((type !== 0x90 && type !== 0x80) || data.length < 2)
			return

		const on = type === 0x90 && data[1]! > 0
		setHeld(current => {
			const next = new Set(current)
			if(on)
				next.add(data[0]!)
			else
				next.delete(data[0]!)
			return next
		})
	}), [device])

	return held
}

export default function Keyboard() {
	const device = useDevice<OP1>()
	const held = useHeldNotes()

	const play = (note: number) => (start: PointerEvent) => {
		device.receive([0x90, note, 100])
		startDrag(start, () => {}, () => device.receive([0x80, note, 0]))
	}

	const key = (note: number) => (
		<button
			key={note}
			type="button"
			tabIndex={-1}
			aria-label={`note ${note}`}
			aria-pressed={held.has(note)}
			className={cn(classes.pianoKey, isBlack(note) && classes.black, held.has(note) && classes.held)}
			onPointerDown={play(note)}
		/>
	)

	return (
		<div className={classes.keyboard}>
			<div className={classes.blackRow}>
				{KEYS.filter(note => !isBlack(note)).map(white => {
					// A black key sits after each white key that has one
					const black = white + 1
					return KEYS.includes(black) && isBlack(black) ? key(black) : <div key={`gap-${white}`} className={classes.gap} />
				})}
			</div>
			<div className={classes.whiteRow}>
				{KEYS.filter(note => !isBlack(note)).map(key)}
			</div>
		</div>
	)
}
