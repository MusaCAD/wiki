// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

// Types for Starlight's virtual modules used by the component overrides. Starlight resolves
// them at build time; `astro check` needs to know their shape.
declare module 'virtual:starlight/components/*' {
	const Component: import('astro/runtime/server/index.js').AstroComponentFactory;
	export default Component;
}
declare module 'virtual:starlight/project-context' {
	const project: {
		root: string;
		srcDir: string;
		trailingSlash: 'always' | 'never' | 'ignore';
		build: { format: 'file' | 'directory' | 'preserve' };
		legacyCollections: boolean;
	};
	export default project;
}
declare module 'virtual:starlight/pagefind-config' {
	export const pagefindUserConfig: Record<string, unknown>;
}
declare module 'virtual:starlight/user-config' {
	const config: Record<string, unknown>;
	export default config;
}
