<script lang="ts">
	import '@fontsource/pretendard';

	// font weights
	import '@fontsource/pretendard/100';
	import '@fontsource/pretendard/200';
	import '@fontsource/pretendard/300';
	import '@fontsource/pretendard/400';
	import '@fontsource/pretendard/500';
	import '@fontsource/pretendard/600';
	import '@fontsource/pretendard/700';
	import '@fontsource/pretendard/800';
	import '@fontsource/pretendard/900';

	// global styles
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
