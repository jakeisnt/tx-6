import {
	arrowKeys,
	cn,
	sendControl,
	startDrag,
	useEncoder,
	useMomentary as useKitMomentary,
	usePairable as useKitPairable,
	useWheel
} from '@ulnd/te-site-kit'
import type { TX6, TX6ButtonEvent, TX6EqEvent, TX6EventType, TX6SliderEvent } from '@ulnd/teenage'
import { useControl, useDevice } from '@ulnd/teenage/react'
import type { CSSProperties, PointerEvent } from 'react'

import { at, FADER } from '../lib/geometry.ts'
import classes from './controls.module.scss'

const KNOB_SWEEP = 270

type Point = { x: number, y: number }

/** In pairing mode a press arms the control instead of moving it. */
function usePairable(event: TX6EventType) {
	const { learning, armed, pairOnPress } = useKitPairable(event)
	return { pairingClass: cn(learning && classes.pairable, armed && classes.armed), pairOnPress }
}

/** EQ knob. Drag vertically, scroll, or use the arrow keys. */
export function Knob({ event, tone, x, y }: Point & { event: TX6EqEvent, tone: 'dark' | 'orange' | 'cream' }) {
	const device = useDevice<TX6>()
	// Knobs sit at 12 o'clock until the device reports otherwise
	const value = useControl<TX6>(event).value ?? 64
	const ref = useWheel(steps => sendControl(device, event, value + steps * 4))
	const { pairingClass, pairOnPress } = usePairable(event)

	const onPointerDown = (start: PointerEvent) => {
		if(pairOnPress(start))
			return

		startDrag(start, (_, dy) => sendControl(device, event, value - dy * 0.8))
	}

	return (
		<div
			ref={ref}
			role="slider"
			tabIndex={0}
			aria-label={event}
			aria-valuemin={0}
			aria-valuemax={127}
			aria-valuenow={value}
			className={cn(classes.knob, tone !== 'dark' && classes[tone], pairingClass)}
			style={at(x, y)}
			onPointerDown={onPointerDown}
			onKeyDown={arrowKeys(step => sendControl(device, event, value + step * 4))}
		>
			<div className={classes.knobTurn} style={{ transform: `rotate(${(value / 127 - 0.5) * KNOB_SWEEP}deg)` }}>
				<div className={classes.knobGroove} />
			</div>
			<div className={classes.knobWell} />
		</div>
	)
}

/** Channel fader. The TX-6 sends 127 at the top of travel. */
export function Fader({ event, x, y }: Point & { event: TX6SliderEvent }) {
	const device = useDevice<TX6>()
	const progress = useControl<TX6>(event).progress ?? 0
	const value = Math.round(progress * 127)
	const ref = useWheel(steps => sendControl(device, event, value + steps * 4))

	const valueAt = (element: HTMLElement, clientY: number) => {
		const rect = element.getBoundingClientRect()
		const offset = (clientY - rect.top) * FADER.height / rect.height
		return (FADER.travelBottom - offset) / (FADER.travelBottom - FADER.travelTop) * 127
	}

	const { pairingClass, pairOnPress } = usePairable(event)

	const onPointerDown = (start: PointerEvent<HTMLDivElement>) => {
		if(pairOnPress(start))
			return

		const element = start.currentTarget
		sendControl(device, event, valueAt(element, start.clientY))
		startDrag(start, (_, __, move) => sendControl(device, event, valueAt(element, move.clientY)))
	}

	const thumbY = FADER.travelTop + (1 - progress) * (FADER.travelBottom - FADER.travelTop)

	return (
		<div
			ref={ref}
			role="slider"
			tabIndex={0}
			aria-label={event}
			aria-orientation="vertical"
			aria-valuemin={0}
			aria-valuemax={127}
			aria-valuenow={value}
			className={cn(classes.fader, pairingClass)}
			style={at(x, y)}
			onPointerDown={onPointerDown}
			onKeyDown={arrowKeys(step => sendControl(device, event, value + step * 4))}
		>
			<div className={classes.faderSlit} />
			<div className={classes.faderThumb} style={{ top: `calc(${thumbY} * var(--u))` }} />
		</div>
	)
}

type ButtonProps = Point & { event: TX6ButtonEvent }

/** A momentary button: pressed while the pointer or key is held down. */
function useMomentary(event: TX6ButtonEvent) {
	const { pressed, pairing, props } = useKitMomentary(event)
	return { pressed, pairingClass: cn(pairing.learning && classes.pairable, pairing.armed && classes.armed), props }
}

export function ChannelButton({ event, x, y }: ButtonProps) {
	const { pressed, pairingClass, props } = useMomentary(event)
	return <div {...props} className={cn(classes.channelButton, pressed && classes.pressed, pairingClass)} style={at(x, y)} />
}

export function FXButton({ event, x, y }: ButtonProps & { event: 'fx1' | 'fx2' }) {
	const { pressed, pairingClass, props } = useMomentary(event)
	const bars = event === 'fx1' ? 1 : 2

	return (
		<div {...props} className={cn(classes.fxButton, pressed && classes.pressed, pairingClass)} style={at(x, y)}>
			<div className={cn(classes.pill, bars === 2 && classes.pillOrange)}>
				<div className={classes.pillBar} />
				{bars === 2 && <div className={classes.pillBar} />}
			</div>
		</div>
	)
}

export function ShiftButton({ x, y }: Point) {
	const { pressed, pairingClass, props } = useMomentary('shift')

	return (
		<div {...props} className={cn(classes.shiftButton, pressed && classes.pressed, pairingClass)} style={at(x, y)}>
			<div className={classes.shiftDot} />
		</div>
	)
}

/** Select encoder: drag around it or scroll to turn, click or press Enter to push. */
export function Encoder({ x, y }: Point) {
	const pressed = useControl<TX6>('select.button').pressed ?? false
	// The push switch can be paired from the log panel's control list
	const { ref, angle, pairing, onPointerDown, onKeyDown } = useEncoder('select.encoder', { push: 'select.button', detent: 18 })

	return (
		<div
			ref={ref}
			role="slider"
			tabIndex={0}
			aria-label="select encoder"
			aria-valuenow={angle / 18}
			className={cn(classes.encoder, pairing.learning && classes.pairable, pairing.armed && classes.armed)}
			style={at(x, y)}
			onPointerDown={onPointerDown}
			onKeyDown={onKeyDown}
		>
			<div className={classes.encoderTick} style={{ '--angle': '-45deg' } as CSSProperties} />
			<div className={classes.encoderTick} style={{ '--angle': '135deg' } as CSSProperties} />
			<div className={cn(classes.encoderKnob, pressed && classes.pressed)}>
				<div className={classes.encoderKnurl} style={{ transform: `rotate(${angle}deg)` }} />
				<div className={classes.encoderFace} />
			</div>
		</div>
	)
}
