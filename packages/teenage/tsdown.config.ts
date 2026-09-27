import { resolve } from 'node:path'

import { defineConfig } from 'tsdown'

/**
 * @ulnd/teenage is the only published package. Every other workspace package
 * (the shared core, the device packages, the hooks) is private and bundled in
 * here; only React stays external, as an optional peer.
 */
export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'web-bluetooth': 'src/web-bluetooth.ts',
		'web-midi': 'src/web-midi.ts',
		react: 'src/react.ts'
	},
	format: 'esm',
	platform: 'neutral',
	target: 'es2022',
	fixedExtension: false,
	sourcemap: true,
	dts: { sourcemap: true },
	// Covers every package's source, so declarations can span the private packages bundled in
	tsconfig: resolve(import.meta.dirname, '../tsconfig.build.json'),
	deps: {
		neverBundle: [/^react(\/|$)/],
		// The build fails if the output imports anything else, e.g. a private package left external
		onlyImport: [/^react(\/|$)/]
	}
})
