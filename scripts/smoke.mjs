// Loads the built @ulnd/teenage in plain Node, with no DOM or browser globals,
// the way a consumer would import it from npm.
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

assert.equal(typeof globalThis.window, 'undefined')

const dist = join(dirname(fileURLToPath(import.meta.url)), '../packages/teenage/dist')

const teenage = await import('@ulnd/teenage')
const { webMidi } = await import('@ulnd/teenage/web-midi')
const { webBluetooth } = await import('@ulnd/teenage/web-bluetooth')

const DEVICES = [
	// One control from each device's map, and the message that moves it
	{ className: 'TX6', profile: 'tx6Profile', name: 'TX-6', message: [0xb0, 1, 127], control: 'input1.slider', value: { progress: 1, value: 127 } },
	{ className: 'TP7', profile: 'tp7Profile', name: 'TP-7', message: [0xb0, 1, 1], control: 'reel', value: { direction: 'right', delta: 1, value: 1 } },
	{ className: 'OP1', profile: 'op1Profile', name: 'OP-1 field', message: [0xb0, 39, 127], control: 'play', value: { pressed: true, value: 127 } }
]

for(const device of DEVICES) {
	const Device = teenage[device.className]
	const profile = teenage[device.profile]

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
	assert.deepEqual(instance.getValue(device.control), device.value, device.name)
	await instance.disconnect()

	// The browser transports load anywhere and only fail when used without an implementation
	await assert.rejects(new Device({ transport: webMidi(profile) }).connect(), /Web MIDI is not available/)
	await assert.rejects(new Device({ transport: webBluetooth(profile) }).connect(), /Web Bluetooth is not available/)
	await assert.rejects(new Device().connect(), new RegExp(`No transport provided to connect to the ${device.name}`))
}

// A custom device, from the same building blocks
const custom = teenage.defineDevice({ name: 'Knob-1', midiInputPattern: /knob/i, controllers: new Map([[7, { event: 'knob', kind: 'knob' }]]) })
const knob = new teenage.TEDevice(custom)
knob.receive([0xb0, 7, 127])
assert.deepEqual(knob.getValue('knob'), { progress: 1, value: 127 })

const hooks = await import('@ulnd/teenage/react')
for(const name of ['DeviceProvider', 'useConnection', 'useControl', 'useControls', 'useDevice', 'useDeviceEvent'])
	assert.equal(typeof hooks[name], 'function', name)

// Only the React entry may import React, so the rest works without it; and nothing
// may import the private workspace packages, which are bundled in
for(const file of await readdir(dist)) {
	if(!/\.(js|d\.ts)$/.test(file))
		continue

	const source = await readFile(join(dist, file), 'utf8')
	assert.doesNotMatch(source, /from ["']@ulnd\//, `${file} imports a private package`)
	if(!file.startsWith('react.'))
		assert.doesNotMatch(source, /from ["']react/, `${file} imports react`)
}

const manifest = JSON.parse(await readFile(join(dist, '../package.json'), 'utf8'))
for(const field of ['dependencies', 'peerDependencies'])
	for(const dependency of Object.keys(manifest[field] ?? {}))
		assert.doesNotMatch(dependency, /^@ulnd\//, `${field} lists ${dependency}`)

console.log('smoke: ok')
