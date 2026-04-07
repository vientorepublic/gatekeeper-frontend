<script lang="ts">
	let {
		selectedNamespace,
		selectedVersion,
		supportsAnyVersion,
		availableVersions,
		loading,
		isAuthenticated,
		onVersionChange
	} = $props<{
		selectedNamespace: string;
		selectedVersion: string;
		supportsAnyVersion: boolean;
		availableVersions: string[];
		loading: boolean;
		isAuthenticated: boolean;
		onVersionChange: (version: string) => void;
	}>();

	const sanitizedVersion = $derived(selectedVersion.trim());
	const hasNamespace = $derived(selectedNamespace.trim().length > 0);
	const hasFixedVersions = $derived(availableVersions.length > 0);
	const pathVersionToken = $derived(sanitizedVersion || '{version}');
	const endpointBase = $derived(
		hasNamespace ? `/api/${selectedNamespace}/${pathVersionToken}` : '/api/{namespace}/{version}'
	);
	const sampleGetPath = $derived(`${endpointBase}/health`);
	const samplePostPath = $derived(`${endpointBase}/items`);
	const curlGetSnippet = $derived(
		[
			`curl -X GET "${sampleGetPath}"`,
			'  -H "Authorization: Bearer <issued_api_key>"',
			'  -H "Accept: application/json"'
		].join(' \\\n')
	);
	const curlPostSnippet = $derived(
		[
			`curl -X POST "${samplePostPath}"`,
			'  -H "Authorization: Bearer <issued_api_key>"',
			'  -H "Content-Type: application/json"',
			'  -d \'{"name":"sample"}\''
		].join(' \\\n')
	);
</script>

<section class="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5 lg:p-6">
	<div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h3 class="text-sm font-semibold text-slate-900">REST API 요청 가이드</h3>
		</div>

		{#if hasNamespace}
			<div class="flex w-full items-center gap-2 text-xs text-slate-700 sm:w-auto">
				{#if hasFixedVersions}
					<span class="font-medium">Version</span>
					<select
						value={selectedVersion}
						onchange={(event) => onVersionChange(event.currentTarget.value)}
						class="w-full rounded-lg border-slate-300 bg-white px-2 py-1 sm:w-40"
						aria-label="요청 버전"
						disabled={!hasFixedVersions}
					>
						{#each availableVersions as version (version)}
							<option value={version}>{version}</option>
						{/each}
					</select>
				{/if}
			</div>
		{/if}
	</div>

	{#if loading}
		<div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
			<div class="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
				<div class="h-3 w-20 animate-pulse rounded bg-slate-200"></div>
				<div class="h-3 w-full animate-pulse rounded bg-slate-100"></div>
				<div class="h-3 w-3/4 animate-pulse rounded bg-slate-100"></div>
			</div>
			<div class="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
				<div class="h-3 w-16 animate-pulse rounded bg-slate-200"></div>
				<div class="h-14 w-full animate-pulse rounded bg-slate-100"></div>
				<div class="h-14 w-full animate-pulse rounded bg-slate-100"></div>
			</div>
		</div>
	{:else if !isAuthenticated}
		<p class="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
			로그인 후 API 키를 발급하면 Authorization 헤더에 Bearer 토큰으로 사용할 수 있습니다.
		</p>
	{:else}
		<div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
			<div class="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
				<p class="text-xs font-semibold text-slate-700">기본 규칙</p>
				<ul class="mt-2 space-y-1 text-xs text-slate-600">
					<li>
						Base Path:
						<span class="font-mono break-all text-slate-800">{endpointBase}</span>
					</li>
					{#if !hasFixedVersions && supportsAnyVersion}
						<li>요청 시 {`{version}`}에는 운영 환경에서 허용된 버전을 사용하세요.</li>
					{/if}
					<li>
						Authorization: <span class="font-mono text-slate-800"
							>Bearer &lt;issued_api_key&gt;</span
						>
					</li>
					<li>GET/HEAD는 body 없이 전달, POST/PUT/PATCH는 JSON body 사용</li>
				</ul>
			</div>

			<div class="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
				<p class="text-xs font-semibold text-slate-700">요청 예시</p>
				<div class="mt-2 min-w-0 space-y-2">
					<div>
						<p class="mb-1 text-[11px] font-medium tracking-wide text-slate-500 uppercase">GET</p>
						<pre
							class="max-w-full rounded-lg bg-slate-900 p-2.5 text-[11px] leading-relaxed break-all whitespace-pre-wrap text-slate-100"><code
								>{curlGetSnippet}</code
							></pre>
					</div>
					<div>
						<p class="mb-1 text-[11px] font-medium tracking-wide text-slate-500 uppercase">POST</p>
						<pre
							class="max-w-full rounded-lg bg-slate-900 p-2.5 text-[11px] leading-relaxed break-all whitespace-pre-wrap text-slate-100"><code
								>{curlPostSnippet}</code
							></pre>
					</div>
				</div>
			</div>
		</div>
	{/if}
</section>
