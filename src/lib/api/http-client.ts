import { isRecord, type Decoder } from './validation.js';

function getErrorMessage(value: unknown, status: number): string {
	if (isRecord(value)) {
		if (typeof value.detail === 'string' && value.detail) return value.detail;
		if (typeof value.message === 'string' && value.message) return value.message;
		if (Array.isArray(value.message) && value.message.every((item) => typeof item === 'string')) {
			const message = value.message.join('; ');
			if (message) return message;
		}
	}
	return `Request failed: ${status}`;
}

export async function readJsonResponse<T>(response: Response, decoder: Decoder<T>): Promise<T> {
	let payload: unknown;
	try {
		payload = await response.json();
	} catch (cause) {
		throw new Error(
			response.ok ? 'Server returned invalid JSON.' : `Request failed: ${response.status}`,
			{ cause }
		);
	}
	if (!response.ok) throw new Error(getErrorMessage(payload, response.status));
	return decoder(payload);
}
