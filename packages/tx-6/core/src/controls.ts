import type { ControlDefinition } from '@ulnd/te-device'

export const INPUTS = [1, 2, 3, 4, 5, 6] as const
export type TX6Input = typeof INPUTS[number]

export type TX6SliderEvent = `input${TX6Input}.slider`
export type TX6EqEvent = `input${TX6Input}.eq${1 | 2 | 3}`
export type TX6ButtonEvent = `input${TX6Input}.button` | 'select.button' | 'fx1' | 'fx2' | 'shift' | 'aux' | 'cue'
export type TX6EncoderEvent = 'select.encoder'

/** Every TX-6 control and its kind. */
export type TX6ControlKinds =
	& { readonly [C in TX6SliderEvent]: 'slider' }
	& { readonly [C in TX6EqEvent]: 'knob' }
	& { readonly [C in TX6ButtonEvent]: 'button' }
	& { readonly [C in TX6EncoderEvent]: 'encoder' }

/** Controller number → control, as sent by the TX-6 in controller mode (midi menu: ctrl out). See docs/tx-6-midi.md. */
export const TX6_CONTROLLERS: ReadonlyMap<number, ControlDefinition<TX6ControlKinds>> = (() => {
	const map = new Map<number, ControlDefinition<TX6ControlKinds>>()

	for(const n of INPUTS) {
		map.set(n, { event: `input${n}.slider`, kind: 'slider' })
		map.set(6 + n, { event: `input${n}.eq1`, kind: 'knob' })
		map.set(12 + n, { event: `input${n}.eq2`, kind: 'knob' })
		map.set(18 + n, { event: `input${n}.eq3`, kind: 'knob' })
		map.set(24 + n, { event: `input${n}.button`, kind: 'button' })
	}

	map.set(31, { event: 'select.encoder', kind: 'encoder' })

	const buttons = ['select.button', 'fx1', 'fx2', 'shift', 'aux', 'cue'] as const
	for(const [index, event] of buttons.entries())
		map.set(32 + index, { event, kind: 'button' })

	return map
})()
