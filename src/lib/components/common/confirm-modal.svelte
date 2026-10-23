<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	import BaseModal from '#lib/components/common/base-modal.svelte';
	const modalId = $props.id();

	let {
		open,
		title,
		message,
		confirmLabel = '확인',
		cancelLabel = '취소',
		confirming = false,
		onConfirm,
		onCancel
	}: {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		confirming?: boolean;
		onConfirm: () => void | Promise<void>;
		onCancel: () => void;
	} = $props();
</script>

<BaseModal
	{open}
	onClose={onCancel}
	closeDisabled={confirming}
	ariaLabelledBy={`${modalId}-title`}
	ariaDescribedBy={`${modalId}-description`}
>
	<h2 id={`${modalId}-title`} class="text-lg font-semibold text-slate-900">{title}</h2>
	<p id={`${modalId}-description`} class="mt-2 text-sm leading-6 text-slate-600">{message}</p>

	<div class="mt-6 flex justify-end gap-3">
		<button
			type="button"
			class="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
			onclick={onCancel}
			disabled={confirming}
		>
			{cancelLabel}
		</button>
		<button
			type="button"
			class="inline-flex min-w-24 cursor-pointer items-center justify-center gap-2 rounded-lg border border-rose-300 bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
			onclick={onConfirm}
			disabled={confirming}
		>
			{#if confirming}
				<span
					class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-rose-200 border-t-white"
					in:scale={{ duration: 120, start: 0.82 }}
					out:fade={{ duration: 90 }}
				></span>
			{/if}
			{confirming ? '처리 중...' : confirmLabel}
		</button>
	</div>
</BaseModal>
