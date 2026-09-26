import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const lib = (path: string) => resolve(import.meta.dirname, '../packages', path)

export default defineConfig({
	plugins: [react()],
	resolve: {
		// Build against the library source so the demo never needs a separate build step
		alias: [
			{ find: /^@ulnd\/tx-6$/, replacement: lib('tx-6/src/index.ts') },
			{ find: /^@ulnd\/tx-6\/web-bluetooth$/, replacement: lib('tx-6/src/transports/web-bluetooth.ts') },
			{ find: /^@ulnd\/tx-6\/web-midi$/, replacement: lib('tx-6/src/transports/web-midi.ts') },
			{ find: /^@ulnd\/use-tx-6$/, replacement: lib('use-tx-6/src/index.tsx') }
		]
	},
	build: {
		outDir: 'dist'
	}
})
