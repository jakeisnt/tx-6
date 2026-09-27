import { DeviceSite, loadBindings } from '@ulnd/te-site-kit'
import { TX6, tx6 } from '@ulnd/tx-6'
import { webBluetooth } from '@ulnd/tx-6/web-bluetooth'
import { TX6Provider } from '@ulnd/use-tx-6'
import { useMemo } from 'react'

import Device from './components/Device.tsx'

function Setup() {
	return (
		<>
			<ol>
				<li>open the <b>system menu</b> and go to <b>midi</b>.</li>
				<li>turn the select encoder to <b>CTRL</b> and tap select until it reads <b>OUT</b>, so knobs, faders and buttons send midi cc.</li>
				<li>press <b>shift</b> to exit. the <b>TX</b> marker on the display flickers when you move a fader.</li>
			</ol>
			<p>
				<b>bluetooth:</b> bluetooth is off by default. in the system menu go to <b>ble</b>, pick <b>ACCEPT</b>, then click connect bluetooth and choose the TX-6.
				{' '}<b>usb:</b> plug in a usb-c cable and click midi.
			</p>
			<p>
				full midi reference in the{' '}
				<a href="https://github.com/jakeisnt/tx-6/blob/main/docs/tx-6-midi.md" target="_blank" rel="noreferrer">docs</a>
				{' '}and teenage engineering's{' '}
				<a href="https://teenage.engineering/guides/tx-6" target="_blank" rel="noreferrer">TX-6 guide</a>.
			</p>
		</>
	)
}

export default function App() {
	const device = useMemo(() => new TX6({ transport: webBluetooth(), bindings: loadBindings(tx6) }), [])

	return (
		// The drawing uses the TX-6 hooks; the site chrome uses the kit's
		<TX6Provider device={device}>
			<DeviceSite site="tx-6" device={device} setup={<Setup />}>
				<Device />
			</DeviceSite>
		</TX6Provider>
	)
}
