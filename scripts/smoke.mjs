// Loads the built packages in plain Node, with no DOM or browser globals,
// the way a consumer would import them from npm.
import assert from 'node:assert/strict'

assert.equal(typeof globalThis.window, 'undefined')

const { TX6 } = await import('@ulnd/tx-6')
const { webBluetooth } = await import('@ulnd/tx-6/web-bluetooth')
const { webMidi } = await import('@ulnd/tx-6/web-midi')

// A headless TX-6 fed by a custom transport
let sink
const tx6 = new TX6({
	transport: {
		async connect(s) {
			sink = s
		},
		disconnect() {}
	}
})
await tx6.connect()
sink.message([0xb0, 1, 127])
assert.deepEqual(tx6.getValue('input1.slider'), { progress: 1, value: 127 })
await tx6.disconnect()

// The browser transports load anywhere and only fail when used without an implementation
await assert.rejects(new TX6({ transport: webMidi() }).connect(), /Web MIDI is not available/)
await assert.rejects(new TX6({ transport: webBluetooth() }).connect())

const hooks = await import('@ulnd/use-tx-6')
for(const name of ['default', 'TX6Provider', 'useTX6', 'useTX6Attribute', 'useTX6Attributes', 'useTX6Device'])
	assert.equal(typeof hooks[name], 'function', name)

console.log('smoke: ok')
