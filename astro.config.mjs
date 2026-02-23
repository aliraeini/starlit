// @ts-check
import { defineConfig } from 'astro/config';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import starlight from '@astrojs/starlight';
import tailwindcss from "@tailwindcss/vite";
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax';

let starlightConfig = { // default one, to be overwritten from src/content/docs/starlightConfig.mjs
	title: 'My Docs!',
	sidebar: [
		{
			label: 'Guides',
			items: [ // Each item here is one entry in the navigation menu.
				{ label: 'Example Guide', slug: 'guides/example' },
			],
		},
		{
			label: 'Reference',
			autogenerate: { directory: 'reference' },
		},
	],
	customCss: [ // Relative path to your custom CSS file
		'src/styles/custom-bugfix.css',
	],
};

try {
	const customConfig = await import('./src/content/docs/starlight.config.mjs');
	if (customConfig && customConfig.default) {
		starlightConfig = customConfig.default;
	}
} catch (e) {
    console.warn("Could not load optional custom config './src/content/docs/starlight.config.mjs', using defaults.");
}

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight(starlightConfig),
		tailwindcss()
	],
	markdown: {
		remarkPlugins: [remarkMath],
		rehypePlugins: [rehypeMathjax],
	},
	vite: {
		plugins: [
			viteStaticCopy({
				targets: [
					{
						src: '../public/*',
						dest: './'  // Copies to the root of the dist/ directory
					}
				]
			})
		]
	}
});
