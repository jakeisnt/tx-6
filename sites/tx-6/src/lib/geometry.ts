import type { CSSProperties } from 'react'

// Every position below is measured in pixels from a 2000×2000 product photo of the
// TX-6, relative to the top-left corner of the device body (1212×1754). The page
// renders them in `--u` units, so the whole device scales as one piece.

export const DEVICE = { width: 1212, height: 1754 }

/** Extra room around the body for the side tab and the knurled knob underneath. */
export const SCENE = { left: 66, width: 1278, height: 2000 }

export const COLUMNS = [100, 246, 393, 539, 685, 832] as const

export const KNOB_ROWS = [298, 517, 736] as const

export const COLUMN_DOTS = [822, 852, 882, 912, 942] as const

export const FADER = { centerY: 1219, height: 450, width: 46, travelTop: 30, travelBottom: 423 }

export const FADER_DOT_Y = 1491

export const CHANNEL_BUTTON_Y = 1606

export const LCD = { x: 1047, y: 392.5 }

export const ENCODER = { x: 1048, y: 736 }

export const FX_BUTTONS = [{ x: 1048, y: 1098 }, { x: 1048, y: 1339 }] as const

export const SHIFT = { x: 1048, y: 1612 }

/** Centre an element on a point measured in photo pixels. */
export function at(x: number, y: number): CSSProperties {
	return { '--x': x, '--y': y } as CSSProperties
}
