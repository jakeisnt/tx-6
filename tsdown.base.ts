import { defineConfig, type UserConfig } from 'tsdown'

/**
 * Build config shared by every published device package. The private shared
 * cores (@ulnd/te-device, @ulnd/use-te-device) are bundled in, since they're
 * never published; everything else a package imports stays external.
 */
export function devicePackage(entry: Record<string, string>, imports: (string | RegExp)[] = []): UserConfig {
	return defineConfig({
		entry,
		format: 'esm',
		platform: 'neutral',
		target: 'es2022',
		fixedExtension: false,
		sourcemap: true,
		dts: { sourcemap: true },
		// Shared by every package, so declarations can span the shared cores they bundle
		tsconfig: '../../tsconfig.build.json',
		deps: {
			neverBundle: imports,
			// The build fails if the output imports anything else, e.g. a private core left external
			onlyImport: imports
		}
	})
}
