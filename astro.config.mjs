// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from "@tailwindcss/vite";
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'ECO-AI',
			social: [{ icon: 'seti:git', label: 'Gitea', href: 'http://hwnaga:47030' }],
			sidebar: [
				{
					label: 'Guides',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: 'Example Guide', slug: 'guides/example' },
					],
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
			],
			customCss: [
				// Relative path to your custom CSS file
				'./src/styles/custom-bugfix.css',
			],
		}),
		tailwindcss()
	],
	markdown: {
		remarkPlugins: [remarkMath],
		rehypePlugins: [rehypeMathjax],
	}
});
