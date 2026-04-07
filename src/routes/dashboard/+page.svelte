<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		authStore,
		clearSession,
		getAuthSnapshot,
		initializeAuthState
	} from '$lib/auth/auth-client';
	import {
		createApiKey,
		type ApiKeyItem,
		fetchApiKeys,
		fetchNamespaces,
		revokeApiKeyById
	} from '$lib/api/auth-api';
	import ConfirmModal from '$lib/components/common/confirm-modal.svelte';
	import ApiKeysList from '$lib/components/dashboard/api-keys-list.svelte';
	import DashboardIntroCard from '$lib/components/dashboard/dashboard-intro-card.svelte';
	import IssuedKeyPanel from '$lib/components/dashboard/issued-key-panel.svelte';
	import NamespaceActionsPanel from '$lib/components/dashboard/namespace-actions-panel.svelte';
	import TopNavigation from '$lib/components/top-navigation.svelte';
	import { onMount } from 'svelte';

	let loadingNamespaces = $state(false);
	let loadingKeys = $state(false);
	let issuingKey = $state(false);
	let confirmIssueOpen = $state(false);
	let revokingKeyId = $state<string | null>(null);
	let confirmRevokeOpen = $state(false);
	let pendingRevokeKeyId = $state<string | null>(null);
	let copyingIssuedKey = $state(false);
	let bootstrappingDashboard = $state(true);
	let errorMessage = $state('');
	let noticeMessage = $state('');

	let namespaces = $state<string[]>([]);
	let selectedNamespace = $state('');
	let apiKeys = $state<ApiKeyItem[]>([]);
	let newLabel = $state('');
	let issuedPlainKey = $state('');
	let keyCopied = $state(false);

	const user = $derived($authStore.user);
	const isAuthenticated = $derived(
		Boolean($authStore.gatewayAccessToken) && $authStore.user !== null
	);
	const isBusy = $derived(
		loadingNamespaces || loadingKeys || issuingKey || copyingIssuedKey || Boolean(revokingKeyId)
	);

	onMount(async () => {
		try {
			initializeAuthState();
			const snapshot = getAuthSnapshot();

			if (!snapshot.gatewayAccessToken || !snapshot.user) {
				await goto(resolve('/'));
				return;
			}

			await loadNamespaces();

			if (selectedNamespace) {
				await loadApiKeys(selectedNamespace);
			}
		} finally {
			bootstrappingDashboard = false;
		}
	});

	async function handleSignOut(): Promise<void> {
		clearSession();
		apiKeys = [];
		issuedPlainKey = '';
		noticeMessage = '로그아웃되었습니다.';
		errorMessage = '';
		await goto(resolve('/'));
	}

	async function loadNamespaces(): Promise<void> {
		loadingNamespaces = true;
		try {
			namespaces = await fetchNamespaces();

			if (!selectedNamespace && namespaces.length > 0) {
				selectedNamespace = namespaces[0] as string;
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to load namespaces.';
		} finally {
			loadingNamespaces = false;
		}
	}

	async function loadApiKeys(namespace: string): Promise<void> {
		if (!isAuthenticated) {
			return;
		}

		loadingKeys = true;
		errorMessage = '';

		try {
			apiKeys = await fetchApiKeys(namespace);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to load API keys.';
		} finally {
			loadingKeys = false;
		}
	}

	async function issueApiKey(): Promise<void> {
		if (!isAuthenticated || !selectedNamespace) {
			return;
		}

		confirmIssueOpen = false;
		issuingKey = true;
		keyCopied = false;
		errorMessage = '';
		noticeMessage = '';

		try {
			const created = await createApiKey(selectedNamespace, newLabel);

			issuedPlainKey = created.apiKey;
			newLabel = '';
			noticeMessage =
				'새 API 키가 발급되었습니다. 아래 평문 키는 다시 확인할 수 없으니 지금 복사해 주세요.';
			await loadApiKeys(selectedNamespace);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to issue API key.';
		} finally {
			issuingKey = false;
		}
	}

	async function revokeApiKey(id: string): Promise<void> {
		if (!isAuthenticated || !selectedNamespace) {
			return;
		}

		revokingKeyId = id;
		pendingRevokeKeyId = null;
		confirmRevokeOpen = false;
		errorMessage = '';

		try {
			await revokeApiKeyById(selectedNamespace, id);

			noticeMessage = 'API 키가 폐기되었습니다.';
			await loadApiKeys(selectedNamespace);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to revoke API key.';
		} finally {
			revokingKeyId = null;
		}
	}

	async function copyIssuedKey(): Promise<void> {
		if (!issuedPlainKey) {
			return;
		}

		copyingIssuedKey = true;
		keyCopied = false;

		try {
			await navigator.clipboard.writeText(issuedPlainKey);
			keyCopied = true;
			noticeMessage = '발급된 키를 클립보드에 복사했습니다.';
		} catch {
			errorMessage = '클립보드 복사에 실패했습니다. 수동으로 복사해 주세요.';
		} finally {
			copyingIssuedKey = false;
		}
	}

	function handleNamespaceChange(namespace: string): void {
		selectedNamespace = namespace;
		if (selectedNamespace) {
			void loadApiKeys(selectedNamespace);
		}
	}

	function handleNewLabelChange(label: string): void {
		newLabel = label;
	}

	function handleRefreshKeys(): void {
		if (selectedNamespace) {
			void loadApiKeys(selectedNamespace);
		}
	}

	function requestIssueApiKey(): void {
		if (issuingKey) {
			return;
		}

		confirmIssueOpen = true;
	}

	function cancelIssueConfirm(): void {
		if (issuingKey) {
			return;
		}

		confirmIssueOpen = false;
	}

	async function confirmIssueApiKey(): Promise<void> {
		await issueApiKey();
	}

	function requestRevokeApiKey(id: string): void {
		if (revokingKeyId) {
			return;
		}

		pendingRevokeKeyId = id;
		confirmRevokeOpen = true;
	}

	function cancelRevokeConfirm(): void {
		if (revokingKeyId) {
			return;
		}

		pendingRevokeKeyId = null;
		confirmRevokeOpen = false;
	}

	async function confirmRevokeApiKey(): Promise<void> {
		if (!pendingRevokeKeyId) {
			return;
		}

		await revokeApiKey(pendingRevokeKeyId);
	}
</script>

<main class="min-h-screen bg-slate-50 text-slate-900">
	<TopNavigation {user} onSignOut={handleSignOut} />

	<div class="sr-only" aria-live="polite">
		{#if bootstrappingDashboard}
			대시보드 초기 데이터를 불러오는 중입니다.
		{:else if loadingKeys}
			API 키 목록을 새로 불러오는 중입니다.
		{:else if issuingKey}
			API 키를 발급하는 중입니다.
		{:else if revokingKeyId}
			API 키를 폐기하는 중입니다.
		{:else if loadingNamespaces}
			namespace 목록을 불러오는 중입니다.
		{:else}
			대시보드가 준비되었습니다.
		{/if}
	</div>

	<div class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8" aria-busy={isBusy}>
		<DashboardIntroCard {user} status={$authStore.status} />

		{#if errorMessage}
			<div class="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
				{errorMessage}
			</div>
		{/if}
		{#if noticeMessage}
			<div
				class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-slate-100 p-4 text-sm text-slate-700"
			>
				<p>{noticeMessage}</p>
				{#if issuedPlainKey}
					<button
						type="button"
						class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
						onclick={copyIssuedKey}
						disabled={copyingIssuedKey}
					>
						{#if copyingIssuedKey}
							<span
								class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
							></span>
						{/if}
						{copyingIssuedKey ? '복사 중...' : '평문 키 복사'}
					</button>
				{/if}
			</div>
		{/if}

		<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" aria-busy={isBusy}>
			{#if bootstrappingDashboard}
				<div class="space-y-4">
					<div class="h-5 w-28 animate-pulse rounded bg-slate-200"></div>
					<div class="h-10 w-full animate-pulse rounded-xl bg-slate-200"></div>
					<div class="h-10 w-full animate-pulse rounded-xl bg-slate-200"></div>
					<div class="grid gap-3 md:grid-cols-2">
						<div class="h-22 animate-pulse rounded-2xl bg-slate-100"></div>
						<div class="h-22 animate-pulse rounded-2xl bg-slate-100"></div>
					</div>
				</div>
			{:else}
				<NamespaceActionsPanel
					{namespaces}
					{selectedNamespace}
					{newLabel}
					{loadingNamespaces}
					{loadingKeys}
					{issuingKey}
					{isAuthenticated}
					onNamespaceChange={handleNamespaceChange}
					onRefresh={handleRefreshKeys}
					onIssue={requestIssueApiKey}
					onNewLabelChange={handleNewLabelChange}
				/>

				{#if issuedPlainKey}
					<IssuedKeyPanel {issuedPlainKey} {copyingIssuedKey} {keyCopied} onCopy={copyIssuedKey} />
				{/if}

				<ApiKeysList
					{apiKeys}
					{loadingKeys}
					{isAuthenticated}
					{revokingKeyId}
					onRevoke={requestRevokeApiKey}
				/>
			{/if}
		</section>
	</div>

	<ConfirmModal
		open={confirmIssueOpen}
		title="API 키 발급"
		message="선택한 namespace에 새로운 API 키를 발급하시겠습니까? 발급 직후에만 평문 키를 확인할 수 있습니다."
		confirmLabel="발급"
		cancelLabel="취소"
		confirming={issuingKey}
		onConfirm={confirmIssueApiKey}
		onCancel={cancelIssueConfirm}
	/>

	<ConfirmModal
		open={confirmRevokeOpen}
		title="API 키 폐기"
		message="해당 API 키를 폐기하시겠습니까? 이 작업은 되돌릴 수 없습니다."
		confirmLabel="폐기"
		cancelLabel="취소"
		confirming={Boolean(revokingKeyId)}
		onConfirm={confirmRevokeApiKey}
		onCancel={cancelRevokeConfirm}
	/>
</main>
