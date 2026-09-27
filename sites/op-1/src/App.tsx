import { DeviceSite, loadBindings } from '@ulnd/te-site-kit'
import { OP1, op1Profile } from '@ulnd/teenage'
import { webBluetooth } from '@ulnd/teenage/web-bluetooth'
import { useMemo } from 'react'

import Device from './Device.tsx'

function Setup() {
	return (
		<>
			<p>
				the encoders and keys need to send midi cc. on the original OP-1 that's <b>shift + com → ctrl</b>.
				the field should have the same controller setting in its midi settings: turn it on, along with midi out.
			</p>
			<p>
				<b>usb:</b> plug in a usb-c cable and click midi.
				{' '}<b>bluetooth:</b> turn on bluetooth midi in the settings, then click connect bluetooth and choose the OP-1 field.
			</p>
			<p>
				the controller map comes from the original OP-1 and hasn't been checked on a field yet. if a control
				doesn't respond, open <b>midi log &amp; pairing</b>, click <b>pair controls</b>, pick the control, and move it on the OP-1.
				notes in the{' '}
				<a href="https://github.com/jakeisnt/tx-6/blob/main/docs/op-1-midi.md" target="_blank" rel="noreferrer">docs</a>
				{' '}and teenage engineering's{' '}
				<a href="https://teenage.engineering/guides/op-1-field" target="_blank" rel="noreferrer">OP-1 field guide</a>.
			</p>
		</>
	)
}

export default function App() {
	const device = useMemo(() => new OP1({ transport: webBluetooth(op1Profile), bindings: loadBindings(op1Profile) }), [])

	return (
		<DeviceSite site="op-1" device={device} setup={<Setup />}>
			<Device />
		</DeviceSite>
	)
}
