/** Every device site. Each one links to the others. */
export const SITES = [
	{ id: 'tx-6', name: 'TX-6', kind: 'mixer', devPort: 5173 },
	{ id: 'tp-7', name: 'TP-7', kind: 'field recorder', devPort: 5174 },
	{ id: 'op-1', name: 'OP-1 field', kind: 'synthesizer', devPort: 5175 }
] as const

export type Site = typeof SITES[number]
export type SiteId = Site['id']

/** Where a site lives: its own jake.kitchen subdomain, or its Vite port in development. */
export function siteUrl(site: Site, dev: boolean): string {
	return dev ? `http://localhost:${site.devPort}/` : `https://${site.id}.jake.kitchen/`
}
