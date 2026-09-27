import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig, type UserConfig } from 'vite'

import { SITES, type SiteId } from './src/sites.ts'

const root = resolve(import.meta.dirname, '../..')
const source = (path: string) => resolve(root, path)

// Build against the packages' source so the sites never need a separate build step
const aliases = [
	{ find: /^@ulnd\/te-device$/, replacement: source('packages/te-device/src/index.ts') },
	{ find: /^@ulnd\/te-device\/(web-bluetooth|web-midi)$/, replacement: source('packages/te-device/src/transports/$1.ts') },
	{ find: /^@ulnd\/use-te-device$/, replacement: source('packages/use-te-device/src/index.tsx') },
	{ find: /^@ulnd\/te-site-kit$/, replacement: source('sites/te-site-kit/src/index.ts') },
	...SITES.flatMap(({ id }) => [
		{ find: new RegExp(`^@ulnd/${id}$`), replacement: source(`packages/${id}/core/src/index.ts`) },
		{ find: new RegExp(`^@ulnd/${id}/(web-bluetooth|web-midi)$`), replacement: source(`packages/${id}/core/src/transports/$1.ts`) },
		{ find: new RegExp(`^@ulnd/use-${id}$`), replacement: source(`packages/${id}/react/src/index.ts`) }
	])
]

/** Vite config for one device site. Each gets its own dev port, so the cross-site links work locally. */
export function siteConfig(id: SiteId): UserConfig {
	const site = SITES.find(candidate => candidate.id === id)!

	return defineConfig({
		plugins: [react()],
		resolve: { alias: aliases },
		server: { port: site.devPort, strictPort: true },
		preview: { port: site.devPort, strictPort: true },
		build: { outDir: 'dist' }
	})
}
