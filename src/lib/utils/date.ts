export function formatDateTime(value: string | null): string {
	if (!value) {
		return '-';
	}

	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: new Intl.DateTimeFormat('ko-KR', {
				dateStyle: 'medium',
				timeStyle: 'short'
			}).format(date);
}
