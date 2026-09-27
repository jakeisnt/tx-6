import { cn } from '@ulnd/te-site-kit'
import type { TX6Input } from '@ulnd/tx-6'
import { useTX6Attribute } from '@ulnd/use-tx-6'
import {
	at,
	CHANNEL_BUTTON_Y,
	COLUMN_DOTS,
	COLUMNS,
	ENCODER,
	FADER,
	FADER_DOT_Y,
	FX_BUTTONS,
	KNOB_ROWS,
	SCENE,
	SHIFT
} from '../lib/geometry.ts'
import { ChannelButton, Encoder, Fader, FXButton, Knob, ShiftButton } from './Controls.tsx'
import classes from './device.module.scss'
import LCD from './LCD.tsx'

const TONES = ['dark', 'orange', 'cream'] as const

function Channel({ input, x }: { input: TX6Input, x: number }) {
	// The dot under each fader lights while its channel button is held
	const pressed = useTX6Attribute(`input${input}.button`).pressed ?? false

	return (
		<>
			{KNOB_ROWS.map((y, row) => (
				<Knob key={y} event={`input${input}.eq${(row + 1) as 1 | 2 | 3}`} tone={TONES[row]!} x={x} y={y} />
			))}
			{COLUMN_DOTS.map(y => <div key={y} className={classes.dot} style={at(x, y)} />)}
			<Fader event={`input${input}.slider`} x={x} y={FADER.centerY} />
			<div className={cn(classes.dot, pressed && classes.dotLit)} style={at(x, FADER_DOT_Y)} />
			<ChannelButton event={`input${input}.button`} x={x} y={CHANNEL_BUTTON_Y} />
		</>
	)
}

/** The TX-6, drawn to scale from a product photo. Every control is live. */
export default function Device() {
	return (
		<div className={classes.scene}>
			<div className={classes.sideTab} />
			<div className={classes.jack} style={at(SCENE.left + 323, 1740)} />
			<div className={classes.jack} style={at(SCENE.left + 470, 1740)} />
			<div className={classes.volume}>
				<div className={classes.volumeCollar} />
				<div className={classes.volumeGrip} />
			</div>

			<div className={classes.body}>
				<h1 className={classes.title}>TX–6</h1>

				{COLUMNS.map((x, index) => <Channel key={x} input={(index + 1) as TX6Input} x={x} />)}

				<LCD />
				<Encoder x={ENCODER.x} y={ENCODER.y} />

				<div className={classes.label} style={at(FX_BUTTONS[0].x, 948)}>FX</div>
				<FXButton event="fx1" x={FX_BUTTONS[0].x} y={FX_BUTTONS[0].y} />
				<FXButton event="fx2" x={FX_BUTTONS[1].x} y={FX_BUTTONS[1].y} />

				<div className={classes.label} style={at(SHIFT.x, 1518)}>shift</div>
				<ShiftButton x={SHIFT.x} y={SHIFT.y} />
			</div>
		</div>
	)
}
