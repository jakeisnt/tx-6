import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const lib = (path: string) => resolve(import.meta.dirname, '../src', path)

export default defineConfig({
	plugins: [react()],
	resolve: {
		// Build against the library source so the demo never needs a separate build step
		alias: [
			{ find: /^use-tx-6$/, replacement: lib('index.ts') },
			{ find: /^use-tx-6\/react$/, replacement: lib('react/index.tsx') },
			{ find: /^use-tx-6\/web-bluetooth$/, replacement: lib('transports/web-bluetooth.ts') },
			{ find: /^use-tx-6\/web-midi$/, replacement: lib('transports/web-midi.ts') }
		]
	},
	build: {
		outDir: 'dist'
	}
})
