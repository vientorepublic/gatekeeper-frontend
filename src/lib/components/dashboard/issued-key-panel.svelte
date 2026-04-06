<script lang="ts">
	let { issuedPlainKey, copyingIssuedKey, keyCopied, onCopy } = $props<{
		issuedPlainKey: string;
		copyingIssuedKey: boolean;
		keyCopied: boolean;
		onCopy: () => void | Promise<void>;
	}>();
</script>

<div class="mt-4 rounded-2xl border border-slate-300 bg-slate-100 p-4 text-sm text-slate-800">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="font-semibold">발급된 평문 API 키 (한 번만 표시)</p>
		<button
			type="button"
			class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
			onclick={onCopy}
			disabled={copyingIssuedKey}
		>
			{#if copyingIssuedKey}
				<span
					class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
				></span>
			{/if}
			{copyingIssuedKey ? '복사 중...' : '평문 키 복사'}
		</button>
	</div>

	<p class="mt-2 font-mono text-xs break-all sm:text-sm">{issuedPlainKey}</p>

	{#if keyCopied}
		<p class="mt-3 text-xs text-emerald-700">복사 완료</p>
	{/if}
</div>
