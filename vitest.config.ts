import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: [
			{
				find: '$app/env/public',
				replacement: fileURLToPath(new URL('./tests/mocks/public-env.ts', import.meta.url))
			},
			{
				find: '$app/env',
				replacement: fileURLToPath(new URL('./tests/mocks/app-env.ts', import.meta.url))
			}
		]
	},
	test: { environment: 'node', include: ['src/**/*.test.ts'] }
});
