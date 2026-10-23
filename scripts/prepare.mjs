import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
let kitManifest;

try {
	kitManifest = require.resolve('@sveltejs/kit/package.json');
} catch (error) {
	// Production images omit SvelteKit along with the other development dependencies.
	if (
		!(error instanceof Error) ||
		!('code' in error) ||
		process.env.NODE_ENV !== 'production' ||
		error.code !== 'MODULE_NOT_FOUND'
	) {
		throw error;
	}
}

if (kitManifest) {
	const result = spawnSync(
		process.execPath,
		[join(dirname(kitManifest), 'svelte-kit.js'), 'sync'],
		{
			stdio: 'inherit'
		}
	);
	if (result.error) throw result.error;
	process.exitCode = result.status ?? 1;
}
