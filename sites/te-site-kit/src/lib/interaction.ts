import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react'

import { useControl, useDevice } from '../device.ts'
import { sendControl, tapControl, turnControl } from './controls.ts'
import { startDrag } from './drag.ts'
import { usePairing } from './pairing.tsx'

/**
 * In pairing mode a press arms the control instead of moving it. Returns that
 * state, for styling, and a guard for pointerdown handlers.
 */
export function usePairable(control: string) {
	const { learning, armed, arm } = usePairing()

	return {
		learning,
		armed: armed === control,
		/** True if the press was taken by pairing mode. */
		pairOnPress: (start: PointerEvent) => {
			if(!learning)
				return false

			start.preventDefault()
			arm(armed === control ? null : control)
			return true
		}
	}
}

/** Arrow keys step a control; shift moves four times as far. */
export function arrowKeys(step: (direction: number) => void) {
	return (key: KeyboardEvent) => {
		const direction = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[key.key]
		if(direction) {
			key.preventDefault()
			step(key.shiftKey ? direction * 4 : direction)
		}
	}
}

/** Scroll-wheel steps; a native listener so the page doesn't scroll while turning. */
export function useWheel(onSteps: (steps: number) => void) {
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

/** A momentary button: pressed while the pointer or key is held down. */
export function useMomentary(control: string) {
	const device = useDevice()
	const pressed = (useControl(control) as { pressed?: boolean }).pressed ?? false
	const pairing = usePairable(control)

	return {
		pressed,
		pairing,
		props: {
			role: 'button',
			tabIndex: 0,
			'aria-label': control,
			'aria-pressed': pressed,
			onPointerDown: (start: PointerEvent) => {
				if(pairing.pairOnPress(start))
					return

				sendControl(device, control, 127)
				startDrag(start, () => {}, () => sendControl(device, control, 0))
			},
			onKeyDown: (key: KeyboardEvent) => {
				if((key.key === ' ' || key.key === 'Enter') && !key.repeat) {
					key.preventDefault()
					sendControl(device, control, 127)
				}
			},
			onKeyUp: (key: KeyboardEvent) => {
				if(key.key === ' ' || key.key === 'Enter')
					sendControl(device, control, 0)
			}
		}
	} as const
}

/**
 * A relative encoder: drag around it or scroll to turn, arrow keys to step.
 * A click without turning taps `push`, if the encoder has a push switch.
 * Returns the angle to draw it at, which follows the device's own encoder too.
 */
export function useEncoder(control: string, { push, detent = 18 }: { push?: string, detent?: number } = {}) {
	const device = useDevice()
	const angle = useAngle(control, detent)
	const pairing = usePairable(control)
	const turn = (steps: number) => turnControl(device, control, steps)
	const ref = useWheel(turn)

	const onPointerDown = (start: PointerEvent<HTMLDivElement>) => {
		if(pairing.pairOnPress(start))
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

			const steps = Math.trunc(accumulated / detent)
			if(steps !== 0) {
				turned = true
				accumulated -= steps * detent
				turn(steps)
			}
		}, () => {
			if(!turned && push)
				tapControl(device, push)
		})
	}

	const onKeyDown = (key: KeyboardEvent) => {
		if(push && (key.key === 'Enter' || key.key === ' ')) {
			key.preventDefault()
			if(!key.repeat)
				tapControl(device, push)
			return
		}
		arrowKeys(turn)(key)
	}

	return { ref, angle, pairing, onPointerDown, onKeyDown }
}

/** Accumulated rotation for an encoder, following every turn the device reports. */
function useAngle(control: string, detent: number) {
	const device = useDevice()
	const [angle, setAngle] = useState(0)

	useEffect(() => device.on('event', event => {
		if(event.event === control && 'delta' in event)
			setAngle(current => current + event.delta * detent)
	}), [device, control, detent])

	return angle
}
