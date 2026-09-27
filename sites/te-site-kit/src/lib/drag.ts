import type { PointerEvent as ReactPointerEvent } from 'react'

/**
 * Track a pointer from pointerdown until release, reporting the movement since
 * the start. Listens on window so drags keep working outside the control.
 */
export function startDrag(
	start: ReactPointerEvent,
	onMove: (dx: number, dy: number, event: PointerEvent) => void,
	onEnd?: (event: PointerEvent) => void
) {
	start.preventDefault()
	;(start.currentTarget as HTMLElement).focus({ preventScroll: true })

	const { clientX, clientY, pointerId } = start

	const move = (event: PointerEvent) => {
		if(event.pointerId === pointerId)
			onMove(event.clientX - clientX, event.clientY - clientY, event)
	}

	const end = (event: PointerEvent) => {
		if(event.pointerId !== pointerId)
			return

		window.removeEventListener('pointermove', move)
		window.removeEventListener('pointerup', end)
		window.removeEventListener('pointercancel', end)
		onEnd?.(event)
	}

	window.addEventListener('pointermove', move)
	window.addEventListener('pointerup', end)
	window.addEventListener('pointercancel', end)
}
