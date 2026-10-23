<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<title>Gatekeeper</title>
	<link rel="icon" href={favicon} />
	<meta name="application-name" content="Gatekeeper" />
	<meta name="description" content="Gatekeeper API Key 관리 및 OAuth2 인증 대시보드" />
	<meta name="theme-color" content="#0f172a" />
	<meta property="og:site_name" content="Gatekeeper" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Gatekeeper" />
	<meta property="og:description" content="Gatekeeper API Key 관리 및 OAuth2 인증 대시보드" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Gatekeeper" />
	<meta name="twitter:description" content="Gatekeeper API Key 관리 및 OAuth2 인증 대시보드" />
</svelte:head>
{@render children()}
