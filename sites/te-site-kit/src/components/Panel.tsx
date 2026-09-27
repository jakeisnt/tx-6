import type { CSSProperties, ReactNode } from 'react'

import { cn } from '../lib/cn.ts'
import { useEncoder, useMomentary } from '../lib/interaction.ts'
import classes from './panel.module.scss'

// Simple, live controls for device drawings. Sizes are in `--s` units, which a
// drawing sets once so the whole device scales as one piece.

type Pairing = { learning: boolean, armed: boolean }

const pairingClass = ({ learning, armed }: Pairing) => cn(learning && classes.pairable, armed && classes.armed)

/** A relative encoder with an optional push switch. Drag around it, scroll, or use the arrow keys. */
export function Dial({ control, push, colour = '#2b2a30', size = 72, label, style }: {
	control: string
	push?: string
	colour?: string
	size?: number
	label?: ReactNode
	style?: CSSProperties
}) {
	const { ref, angle, pairing, onPointerDown, onKeyDown } = useEncoder(control, push ? { push } : {})

	return (
		<div className={classes.cell} style={style}>
			<div
				ref={ref}
				role="slider"
				tabIndex={0}
				aria-label={control}
				aria-valuenow={angle}
				className={cn(classes.dial, pairingClass(pairing))}
				style={{ '--size': size, '--cap': colour } as CSSProperties}
				onPointerDown={onPointerDown}
				onKeyDown={onKeyDown}
			>
				<div className={classes.dialTurn} style={{ transform: `rotate(${angle}deg)` }}>
					<div className={classes.dialPointer} />
				</div>
			</div>
			{label !== undefined && <span className={classes.label}>{label}</span>}
		</div>
	)
}

/** A momentary key, pressed while held. */
export function Key({ control, children, tone = 'light', wide = false, style }: {
	control: string
	children?: ReactNode
	tone?: 'light' | 'dark' | 'orange'
	wide?: boolean
	style?: CSSProperties
}) {
	const { pressed, pairing, props } = useMomentary(control)

	return (
		<div
			{...props}
			className={cn(classes.key, classes[tone], wide && classes.wide, pressed && classes.pressed, pairingClass(pairing))}
			style={style}
		>
			{children}
		</div>
	)
}
