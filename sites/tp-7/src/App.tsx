import { DeviceSite, loadBindings } from '@ulnd/te-site-kit'
import { TP7, tp7 } from '@ulnd/tp-7'
import { webBluetooth } from '@ulnd/tp-7/web-bluetooth'
import { TP7Provider } from '@ulnd/use-tp-7'
import { useMemo } from 'react'

import Device from './Device.tsx'

function Setup() {
	return (
		<>
			<p>
				<b>usb:</b> plug the TP-7 into your computer with a usb-c cable and click midi.
				{' '}<b>bluetooth:</b> pair the TP-7 as a MIDI device, then click connect bluetooth.
			</p>
			<p>
				the TP-7's controller numbers aren't published, so this site's map is a best guess. if a control
				doesn't respond, open <b>midi log &amp; pairing</b>, click <b>pair controls</b>, pick the control, and move it on the TP-7.
			</p>
			<p>
				notes in the{' '}
				<a href="https://github.com/jakeisnt/tx-6/blob/main/docs/tp-7-midi.md" target="_blank" rel="noreferrer">docs</a>
				{' '}and teenage engineering's{' '}
				<a href="https://teenage.engineering/guides/tp-7" target="_blank" rel="noreferrer">TP-7 guide</a>.
			</p>
		</>
	)
}

export default function App() {
	const device = useMemo(() => new TP7({ transport: webBluetooth(), bindings: loadBindings(tp7) }), [])

	return (
		<TP7Provider device={device}>
			<DeviceSite site="tp-7" device={device} setup={<Setup />}>
				<Device />
			</DeviceSite>
		</TP7Provider>
	)
}
