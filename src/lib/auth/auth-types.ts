import { decode, isRecord, isNonEmptyString, isNullableString } from '../api/validation.js';

export interface AuthUser {
	id: string;
	provider: string;
	subject: string;
	email: string | null;
	name: string | null;
	avatarUrl: string | null;
}

export interface AuthSessionResponse {
	accessToken: string;
	refreshToken: string | null;
	oauthAccessTokenExpiresIn: number | null;
	tokenType: 'Bearer';
	user: AuthUser;
}

export function isAuthUser(value: unknown): value is AuthUser {
	return (
		isRecord(value) &&
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.provider) &&
		isNonEmptyString(value.subject) &&
		isNullableString(value.email) &&
		isNullableString(value.name) &&
		isNullableString(value.avatarUrl)
	);
}

export function parseSession(value: unknown): AuthSessionResponse {
	return decode(
		value,
		(value): value is AuthSessionResponse =>
			isRecord(value) &&
			isNonEmptyString(value.accessToken) &&
			value.tokenType === 'Bearer' &&
			isNullableString(value.refreshToken) &&
			isAuthUser(value.user) &&
			(value.oauthAccessTokenExpiresIn === null ||
				(typeof value.oauthAccessTokenExpiresIn === 'number' &&
					Number.isFinite(value.oauthAccessTokenExpiresIn) &&
					value.oauthAccessTokenExpiresIn >= 0)),
		'session'
	);
}

export function parseAuthorization(value: unknown): { authorizeUrl: string; state: string } {
	return decode(
		value,
		(value): value is { authorizeUrl: string; state: string } => {
			if (
				!isRecord(value) ||
				!isNonEmptyString(value.authorizeUrl) ||
				!isNonEmptyString(value.state)
			)
				return false;
			try {
				return ['http:', 'https:'].includes(new URL(value.authorizeUrl).protocol);
			} catch {
				return false;
			}
		},
		'authorization'
	);
}
