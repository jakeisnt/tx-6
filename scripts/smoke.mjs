// Loads the built packages in plain Node, with no DOM or browser globals,
// the way a consumer would import them from npm.
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

assert.equal(typeof globalThis.window, 'undefined')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const DEVICES = [
	// One control from each device's map, and the message that moves it
	{ id: 'tx-6', name: 'TX-6', className: 'TX6', hooks: 'TX6', message: [0xb0, 1, 127], control: 'input1.slider', value: { progress: 1, value: 127 } },
	{ id: 'tp-7', name: 'TP-7', className: 'TP7', hooks: 'TP7', message: [0xb0, 1, 1], control: 'reel', value: { direction: 'right', delta: 1, value: 1 } },
	{ id: 'op-1', name: 'OP-1 field', className: 'OP1', hooks: 'OP1', message: [0xb0, 39, 127], control: 'play', value: { pressed: true, value: 127 } }
]

for(const device of DEVICES) {
	const core = await import(`@ulnd/${device.id}`)
	const { webBluetooth } = await import(`@ulnd/${device.id}/web-bluetooth`)
	const { webMidi } = await import(`@ulnd/${device.id}/web-midi`)
	const Device = core[device.className]

	// A headless device fed by a custom transport
	let sink
	const instance = new Device({
		transport: {
			async connect(s) {
				sink = s
			},
			disconnect() {}
		}
	})
	await instance.connect()
	sink.message(device.message)
	assert.deepEqual(instance.getValue(device.control), device.value, device.id)
	await instance.disconnect()

	// The browser transports load anywhere and only fail when used without an implementation
	await assert.rejects(new Device({ transport: webMidi() }).connect(), /Web MIDI is not available/)
	await assert.rejects(new Device({ transport: webBluetooth() }).connect(), /Web Bluetooth is not available/)
	await assert.rejects(new Device().connect(), new RegExp(`No transport provided to connect to the ${device.name}`))

	const hooks = await import(`@ulnd/use-${device.id}`)
	const names = ['default', `${device.hooks}Provider`, `use${device.hooks}`, `use${device.hooks}Attribute`, `use${device.hooks}Attributes`, `use${device.hooks}Device`, `getDefault${device.hooks}`]
	for(const name of names)
		assert.equal(typeof hooks[name], 'function', `${device.id}: ${name}`)

	// The private shared cores are bundled in: nothing published may import them
	for(const kind of ['core', 'react']) {
		const dist = join(root, 'packages', device.id, kind, 'dist')
		for(const file of await readdir(dist, { recursive: true })) {
			if(!/\.(js|d\.ts)$/.test(file))
				continue

			const source = await readFile(join(dist, file), 'utf8')
			assert.doesNotMatch(source, /from ["']@ulnd\/(use-)?te-device/, `${device.id}/${kind}/dist/${file} imports a private package`)
		}

		const manifest = JSON.parse(await readFile(join(dist, '..', 'package.json'), 'utf8'))
		for(const field of ['dependencies', 'peerDependencies'])
			for(const dependency of Object.keys(manifest[field] ?? {}))
				assert.doesNotMatch(dependency, /te-device/, `${manifest.name} ${field} lists ${dependency}`)
	}
}

console.log('smoke: ok')
