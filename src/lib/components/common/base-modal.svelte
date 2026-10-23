<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { dialogFocus } from '#lib/utils/dialog-focus.js';

	let {
		open,
		onClose,
		closeDisabled = false,
		ariaLabelledBy,
		ariaDescribedBy,
		showCloseButton = true,
		children
	}: {
		open: boolean;
		onClose: () => void;
		closeDisabled?: boolean;
		ariaLabelledBy?: string;
		ariaDescribedBy?: string;
		showCloseButton?: boolean;
		children: import('svelte').Snippet;
	} = $props();

	function tryClose(): void {
		if (!closeDisabled) {
			onClose();
		}
	}

	function handleBackdropClick(event: MouseEvent): void {
		if (event.target === event.currentTarget) {
			tryClose();
		}
	}

	function handleWindowKeydown(event: KeyboardEvent): void {
		if (open && event.key === 'Escape') {
			event.preventDefault();
			tryClose();
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4"
		role="presentation"
		transition:fade={{ duration: 140 }}
		onclick={handleBackdropClick}
	>
		<div
			use:dialogFocus
			tabindex="-1"
			class="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby={ariaLabelledBy}
			aria-describedby={ariaDescribedBy}
			transition:scale={{ duration: 170, start: 0.96 }}
		>
			{#if showCloseButton}
				<button
					type="button"
					class="absolute top-3 right-3 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
					onclick={tryClose}
					disabled={closeDisabled}
					aria-label="닫기"
				>
					<span aria-hidden="true" class="text-lg leading-none">&times;</span>
				</button>
			{/if}

			{@render children()}
		</div>
	</div>
{/if}
