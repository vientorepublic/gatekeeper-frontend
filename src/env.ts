import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_GATEKEEPER_API_BASE_URL: {
		public: true,
		schema: (value) => value || 'http://localhost:3000'
	}
});
