const FOCUSABLE =
	'button, a[href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Keeps keyboard focus within a mounted modal and restores its trigger on close. */
export function dialogFocus(node: HTMLElement): { destroy(): void } {
	const previous = document.activeElement;
	const focusable = () =>
		Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
			(element) =>
				!element.matches(':disabled') &&
				!element.closest('[hidden], [inert]') &&
				element.getClientRects().length > 0
		);
	(focusable()[0] ?? node).focus();
	function onKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Tab') return;
		const elements = focusable();
		const first = elements[0] ?? node;
		const last = elements.at(-1) ?? node;
		if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) {
			event.preventDefault();
			last.focus();
		} else if (
			!event.shiftKey &&
			(document.activeElement === last || document.activeElement === node)
		) {
			event.preventDefault();
			first.focus();
		}
	}
	node.addEventListener('keydown', onKeydown);
	return {
		destroy() {
			node.removeEventListener('keydown', onKeydown);
			if (node.contains(document.activeElement) || document.activeElement === document.body) {
				const target =
					previous instanceof HTMLElement && previous.isConnected && !previous.matches(':disabled')
						? previous
						: document.querySelector<HTMLElement>('[data-dialog-return-focus]');
				target?.focus();
			}
		}
	};
}
