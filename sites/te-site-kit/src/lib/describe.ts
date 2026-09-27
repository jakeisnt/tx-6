import type { ControlEvent, ControlKinds } from '@ulnd/te-device'

/** A short readout for a control event, e.g. `input1.slider 0.50` or `reel -2`. */
export function describeEvent(event: ControlEvent<ControlKinds>) {
	if('progress' in event)
		return `${event.event} ${event.progress.toFixed(2)}`
	if('pressed' in event)
		return `${event.event} ${event.pressed ? 'down' : 'up'}`
	return `${event.event} ${event.delta > 0 ? '+' : ''}${event.delta}`
}
