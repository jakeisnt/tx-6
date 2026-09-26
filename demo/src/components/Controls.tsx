import type { TX6ButtonEvent, TX6EqEvent, TX6EventType, TX6SliderEvent } from '@ulnd/tx-6'
import { useTX6Attribute, useTX6Device } from '@ulnd/use-tx-6'
import { type CSSProperties, type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react'

import { cn } from '../lib/cn.ts'
import { startDrag } from '../lib/drag.ts'
import { at, FADER } from '../lib/geometry.ts'
import { sendControl, tapControl } from '../lib/midi.ts'
import { usePairing } from '../lib/pairing.tsx'
import classes from './controls.module.scss'

const KNOB_SWEEP = 270

type Point = { x: number, y: number }

/**
 * In pairing mode a press arms the control instead of moving it. Returns the
 * class to show that state and a guard for pointerdown handlers.
 */
function usePairable(event: TX6EventType) {
	const { learning, armed, arm } = usePairing()

	return {
		pairingClass: cn(learning && classes.pairable, armed === event && classes.armed),
		/** True if the press was taken by pairing mode. */
		pairOnPress: (start: PointerEvent) => {
			if(!learning)
				return false

			start.preventDefault()
			arm(armed === event ? null : event)
			return true
		}
	}
}

/** EQ knob. Drag vertically, scroll, or use the arrow keys. */
export function Knob({ event, tone, x, y }: Point & { event: TX6EqEvent, tone: 'dark' | 'orange' | 'cream' }) {
	const device = useTX6Device()
	// Knobs sit at 12 o'clock until the device reports otherwise
	const value = useTX6Attribute(event).value ?? 64
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
	const device = useTX6Device()
	const progress = useTX6Attribute(event).progress ?? 0
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
	const device = useTX6Device()
	const pressed = useTX6Attribute(event).pressed ?? false
	const { pairingClass, pairOnPress } = usePairable(event)

	return {
		pressed,
		pairingClass,
		props: {
			role: 'button',
			tabIndex: 0,
			'aria-label': event,
			'aria-pressed': pressed,
			onPointerDown: (start: PointerEvent) => {
				if(pairOnPress(start))
					return

				sendControl(device, event, 127)
				startDrag(start, () => {}, () => sendControl(device, event, 0))
			},
			onKeyDown: (key: KeyboardEvent) => {
				if((key.key === ' ' || key.key === 'Enter') && !key.repeat) {
					key.preventDefault()
					sendControl(device, event, 127)
				}
			},
			onKeyUp: (key: KeyboardEvent) => {
				if(key.key === ' ' || key.key === 'Enter')
					sendControl(device, event, 0)
			}
		}
	} as const
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

const ENCODER_DETENT = 18

/** Select encoder: drag around it or scroll to turn, click or press Enter to push. */
export function Encoder({ x, y }: Point) {
	const device = useTX6Device()
	const pressed = useTX6Attribute('select.button').pressed ?? false
	const [angle, setAngle] = useState(0)

	useEffect(() => device.on('select.encoder', ({ delta }) => setAngle(current => current + delta * ENCODER_DETENT)), [device])

	const turn = (steps: number) => {
		for(let i = 0; i < Math.abs(steps); i++)
			sendControl(device, 'select.encoder', steps > 0 ? 1 : 127)
	}

	const ref = useWheel(turn)
	// The push switch can be paired from the log panel's control list
	const { pairingClass, pairOnPress } = usePairable('select.encoder')

	const onPointerDown = (start: PointerEvent<HTMLDivElement>) => {
		if(pairOnPress(start))
			return

		const rect = start.currentTarget.getBoundingClientRect()
		const cx = rect.left + rect.width / 2
		const cy = rect.top + rect.height / 2
		const angleOf = (px: number, py: number) => Math.atan2(py - cy, px - cx) * 180 / Math.PI

		let last = angleOf(start.clientX, start.clientY)
		let accumulated = 0
		let turned = false

		startDrag(start, (_, __, move) => {
			const current = angleOf(move.clientX, move.clientY)
			accumulated += ((current - last + 540) % 360) - 180
			last = current

			const steps = Math.trunc(accumulated / ENCODER_DETENT)
			if(steps !== 0) {
				turned = true
				accumulated -= steps * ENCODER_DETENT
				turn(steps)
			}
		}, () => {
			// A click without turning pushes the encoder
			if(!turned)
				tapControl(device, 'select.button')
		})
	}

	return (
		<div
			ref={ref}
			role="slider"
			tabIndex={0}
			aria-label="select encoder"
			aria-valuenow={angle / ENCODER_DETENT}
			className={cn(classes.encoder, pairingClass)}
			style={at(x, y)}
			onPointerDown={onPointerDown}
			onKeyDown={key => {
				if(key.key === 'Enter' || key.key === ' ') {
					key.preventDefault()
					if(!key.repeat)
						tapControl(device, 'select.button')
					return
				}
				arrowKeys(turn)(key)
			}}
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

function arrowKeys(step: (direction: number) => void) {
	return (key: KeyboardEvent) => {
		const direction = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[key.key]
		if(direction) {
			key.preventDefault()
			step(key.shiftKey ? direction * 4 : direction)
		}
	}
}

/** Scroll-wheel steps; a native listener so the page doesn't scroll while turning. */
function useWheel(onSteps: (steps: number) => void) {
	const ref = useRef<HTMLDivElement>(null)
	const handler = useRef(onSteps)
	handler.current = onSteps

	useEffect(() => {
		const element = ref.current
		if(!element)
			return

		let pending = 0
		const onWheel = (event: WheelEvent) => {
			event.preventDefault()
			pending -= event.deltaY
			const steps = Math.trunc(pending / 40)
			if(steps !== 0) {
				pending -= steps * 40
				handler.current(steps)
			}
		}

		element.addEventListener('wheel', onWheel, { passive: false })
		return () => element.removeEventListener('wheel', onWheel)
	}, [])

	return ref
}
