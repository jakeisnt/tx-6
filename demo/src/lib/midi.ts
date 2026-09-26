import { type TX6, TX6_CONTROLLERS, type TX6EventType } from '@ulnd/tx-6'

const CONTROLLER_FOR = new Map<TX6EventType, number>([...TX6_CONTROLLERS].map(([controller, { event }]) => [event, controller]))

/**
 * Feed a Control Change into the device exactly as the hardware would send it,
 * so on-screen controls and the real TX-6 share one code path.
 */
export function sendControl(device: TX6, event: TX6EventType, value: number) {
	const controller = CONTROLLER_FOR.get(event)
	if(controller === undefined)
		return

	device.receive([0xb0, controller, Math.max(0, Math.min(127, Math.round(value)))])
}

/** Press then release a button. */
export function tapControl(device: TX6, event: TX6EventType) {
	sendControl(device, event, 127)
	setTimeout(() => sendControl(device, event, 0), 120)
}
