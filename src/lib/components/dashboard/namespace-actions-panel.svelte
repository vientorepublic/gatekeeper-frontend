<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	let {
		namespaces,
		selectedNamespace,
		newLabel,
		loadingNamespaces,
		loadingKeys,
		issuingKey,
		isAuthenticated,
		onNamespaceChange,
		onRefresh,
		onIssue,
		onNewLabelChange
	} = $props<{
		namespaces: string[];
		selectedNamespace: string;
		newLabel: string;
		loadingNamespaces: boolean;
		loadingKeys: boolean;
		issuingKey: boolean;
		isAuthenticated: boolean;
		onNamespaceChange: (namespace: string) => void;
		onRefresh: () => void | Promise<void>;
		onIssue: () => void | Promise<void>;
		onNewLabelChange: (label: string) => void;
	}>();
</script>

<div class="flex flex-wrap items-end gap-3">
	<div class="flex min-w-55 flex-1 flex-col gap-2">
		<label class="text-sm font-medium text-slate-700" for="namespace">Namespace</label>
		<select
			id="namespace"
			class="rounded-xl border-slate-300 text-sm"
			value={selectedNamespace}
			disabled={loadingNamespaces}
			onchange={(event) => {
				const namespace = event.currentTarget.value;
				onNamespaceChange(namespace);
			}}
		>
			{#if namespaces.length === 0}
				<option value="">No namespace</option>
			{:else}
				{#each namespaces as namespace (namespace)}
					<option value={namespace}>{namespace}</option>
				{/each}
			{/if}
		</select>
	</div>

	<button
		type="button"
		class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
		onclick={onRefresh}
		disabled={!isAuthenticated || !selectedNamespace || loadingKeys || loadingNamespaces}
	>
		{#if loadingKeys}
			<span
				class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-slate-700"
				in:scale={{ duration: 120, start: 0.82 }}
				out:fade={{ duration: 90 }}
			></span>
		{/if}
		{loadingKeys ? '불러오는 중...' : '목록 새로고침'}
	</button>
</div>

<div class="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
	<input
		class="rounded-xl border-slate-300 text-sm"
		type="text"
		placeholder="새 API 키 라벨 (선택)"
		value={newLabel}
		oninput={(event) => {
			onNewLabelChange(event.currentTarget.value);
		}}
		disabled={!isAuthenticated}
	/>
	<button
		type="button"
		class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
		onclick={onIssue}
		disabled={!isAuthenticated || !selectedNamespace || issuingKey}
	>
		{#if issuingKey}
			<span
				class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-white"
				in:scale={{ duration: 120, start: 0.82 }}
				out:fade={{ duration: 90 }}
			></span>
		{/if}
		{issuingKey ? '발급 중...' : 'API 키 발급'}
	</button>
</div>
