import type { TX6Event } from '@ulnd/tx-6'
import { useTX6, useTX6Attributes, useTX6Device } from '@ulnd/use-tx-6'
import { useEffect, useState } from 'react'
import { cn } from '../lib/cn.ts'
import { at, LCD as POSITION } from '../lib/geometry.ts'
import classes from './lcd.module.scss'

// 5×7 digits for the big readout
const DIGITS: Record<string, string[]> = {
	0: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
	1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
	2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
	3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
	4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
	5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
	6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
	7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
	8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
	9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..']
}

// 3×5 digits for the channel indicator
const SMALL: Record<string, string[]> = {
	1: ['.#.', '##.', '.#.', '.#.', '###'],
	2: ['##.', '..#', '.#.', '#..', '###'],
	3: ['##.', '..#', '.#.', '..#', '##.'],
	4: ['#.#', '#.#', '###', '..#', '..#'],
	5: ['###', '#..', '##.', '..#', '##.'],
	6: ['.##', '#..', '###', '#.#', '###'],
	'-': ['...', '...', '###', '...', '...']
}

const SLIDERS = ['input1.slider', 'input2.slider', 'input3.slider', 'input4.slider', 'input5.slider', 'input6.slider'] as const

const METER_ROWS = 29

function Glyph({ rows, x, y, w, h }: { rows: string[], x: number, y: number, w: number, h: number }) {
	// Slightly oversized cells so neighbouring pixels merge into solid strokes
	return rows.flatMap((row, j) => [...row].map((cell, i) => cell === '#' && (
		// biome-ignore lint/suspicious/noArrayIndexKey: a fixed bitmap; position is the identity
		<rect key={`${i}-${j}`} x={x + i * w} y={y + j * h} width={w + 0.2} height={h + 0.2} />
	)))
}

function Meter({ x, level }: { x: number, level: number }) {
	const lit = Math.round(level * METER_ROWS)

	return (
		<>
			{Array.from({ length: METER_ROWS }, (_, row) => {
				const on = METER_ROWS - row <= lit
				return [0, 9].map(offset => (
					// biome-ignore lint/suspicious/noArrayIndexKey: a fixed grid of meter segments
					<rect key={`${row}-${offset}`} className={on ? undefined : classes.ghost} x={x + offset} y={63 + row * 6} width={4} height={4} />
				))
			})}
			<path d={`M${x - 1} 235 h5 v5 h5 v-5 h5 v14 h-15 z`} />
		</>
	)
}

function describe(event: TX6Event): { value?: number, channel?: string } {
	const channel = /^input(\d)/.exec(event.event)?.[1]

	if('progress' in event)
		return { value: Math.round(event.progress * 99), channel }
	if('pressed' in event)
		return { value: event.pressed ? 99 : 0, channel: channel ?? '-' }

	return { channel: '-' }
}

/** The screen: connection status, last-touched control and output meters. */
export default function LCD() {
	const device = useTX6Device()
	const { status } = useTX6()
	const sliders = useTX6Attributes(SLIDERS)

	const [value, setValue] = useState(50)
	const [channel, setChannel] = useState('1')
	const [fx, setFX] = useState<1 | 2>(1)

	useEffect(() => device.on('event', event => {
		const described = describe(event)
		if(described.channel)
			setChannel(described.channel)

		if(event.event === 'select.encoder')
			setValue(current => (current + event.delta + 100) % 100)
		else if(described.value !== undefined)
			setValue(described.value)

		if(event.event === 'fx1' && event.pressed)
			setFX(1)
		if(event.event === 'fx2' && event.pressed)
			setFX(2)
	}), [device])

	const levels = sliders.map(slider => slider.progress ?? 0)
	const left = (levels[0]! + levels[2]! + levels[4]!) / 3
	const right = (levels[1]! + levels[3]! + levels[5]!) / 3
	const digits = String(value).padStart(2, '0')

	return (
		<div className={classes.lcd} style={at(POSITION.x, POSITION.y)} aria-hidden>
			<svg className={classes.screen} viewBox="0 0 200 273" aria-hidden="true">
				<defs>
					<pattern id="checker" width="8" height="8" patternUnits="userSpaceOnUse" x="23" y="110">
						<rect width="4" height="4" />
						<rect x="4" y="4" width="4" height="4" />
					</pattern>
				</defs>

				{/* Battery */}
				<rect x="15" y="28" width="30" height="12" />
				<rect x="46" y="31" width="3" height="6" />

				{/* Bluetooth link: blinks while connecting */}
				{status !== 'disconnected' && (
					<g className={cn(status === 'connecting' && classes.blink)}>
						<rect x="67" y="27" width="4" height="6" />
						<rect x="63" y="33" width="12" height="4" />
						<rect x="67" y="37" width="4" height="7" />
					</g>
				)}

				{/* L / R */}
				<rect x="128" y="19" width="30" height="30" />
				<rect x="163" y="19" width="30" height="30" />
				<g fill="#d3e4ec">
					<rect x="136" y="25" width="5" height="18" />
					<rect x="136" y="38" width="16" height="5" />
					<rect x="171" y="25" width="5" height="18" />
					<rect x="171" y="25" width="14" height="5" />
					<rect x="182" y="25" width="5" height="10" />
					<rect x="171" y="31" width="14" height="4" />
					<rect x="180" y="35" width="5" height="4" />
					<rect x="183" y="38" width="5" height="5" />
				</g>

				{/* Active effect, drawn like the FX button inlays */}
				<rect x="23" y="63" width="95" height="39" />
				<g fill="#d3e4ec">
					{fx === 1
						? <rect x="67" y="68" width="8" height="29" />
						: <><rect x="56" y="68" width="8" height="29" /><rect x="78" y="68" width="8" height="29" /></>}
				</g>

				{/* Channel of the last control touched */}
				<rect x="23" y="110" width="40" height="38" fill="url(#checker)" />
				<rect x="83" y="110" width="36" height="38" fill="url(#checker)" />
				<Glyph rows={SMALL[channel] ?? SMALL['-']!} x={66} y={110} w={5} h={7.6} />

				{/* Value */}
				<Glyph rows={DIGITS[digits[0]!]!} x={23} y={180} w={8.8} h={9.7} />
				<Glyph rows={DIGITS[digits[1]!]!} x={76} y={180} w={8.8} h={9.7} />

				<Meter x={142} level={left} />
				<Meter x={168} level={right} />
			</svg>
		</div>
	)
}
