import type { AnyDevice } from '../device.ts'

/**
 * Feed a Control Change into the device exactly as the hardware would send it,
 * so on-screen controls and the real device share one code path.
 */
export function sendControl(device: AnyDevice, control: string, value: number) {
	const controller = device.profile.controllerFor(control)
	if(controller === undefined)
		return

	device.receive([0xb0, controller, Math.max(0, Math.min(127, Math.round(value)))])
}

/** Press then release a button. */
export function tapControl(device: AnyDevice, control: string) {
	sendControl(device, control, 127)
	setTimeout(() => sendControl(device, control, 0), 120)
}

/** Turn a relative encoder by whole detents. */
export function turnControl(device: AnyDevice, control: string, steps: number) {
	for(let i = 0; i < Math.abs(steps); i++)
		sendControl(device, control, steps > 0 ? 1 : 127)
}
