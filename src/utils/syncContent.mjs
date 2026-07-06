import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getRootDir() {
    const starlitRoot = path.join(__dirname, '..', '..');
    const parentRoot = path.join(starlitRoot, '..');
    if (existsSync(path.join(parentRoot, 'content'))) {
        return parentRoot;
    }
    try { // Assume users consume this as git subtree or submodule
        let gitRoot = execSync('git rev-parse --show-superproject-working-tree', { stdio: 'pipe' }).toString().trim();
        if (!gitRoot) {
            gitRoot = execSync('git rev-parse --show-toplevel', { stdio: 'pipe' }).toString().trim();
        }
        return gitRoot;
    } catch { // default to the starlit project root
        return starlitRoot;
    }
}

const contentsDir = path.join(getRootDir(), 'content');

// Do not change the following paths
const docsDestDir = path.join(__dirname, '..', 'content');
const slidesDestDir = path.join(__dirname, '..', 'slides');

async function getFiles(dir) {
    if (!existsSync(dir)) return [];
    let results = [];
    const list = await fs.readdir(dir, { withFileTypes: true });
    for (const file of list) {
        const fullPath = path.resolve(dir, file.name);
        if (file.isDirectory()) {
            results = results.concat(await getFiles(fullPath));
        } else {
            results.push(fullPath);
        }
    }
    return results;
}

let hasSyncErrors = false;

function validateImage(imgPath, mdFile, relPath) {
    // Ignore external URLs and absolute paths
    if (/^(https?:)?\/\//.test(imgPath) || imgPath.startsWith('/')) {
        return;
    }
    // Strip hash/query parameters if any (e.g. path.png#header)
    const cleanPath = imgPath.split('#')[0].split('?')[0];
    const fullImgPath = path.resolve(path.dirname(mdFile), cleanPath);
    if (!existsSync(fullImgPath)) {
        console.error(`\x1b[31m[ImageNotFound] In file: ${relPath}\x1b[0m`);
        console.error(`  Could not find referenced image: "${imgPath}"`);
        console.error(`  Resolved path: "${fullImgPath}"\n`);
        hasSyncErrors = true;
    }
}

async function sync() {
    console.log(`Synchronizing ${contentsDir}/...`);
    
    // Ensure destination directories exist
    await fs.mkdir(docsDestDir, { recursive: true });
    await fs.mkdir(slidesDestDir, { recursive: true });

    if (!existsSync(contentsDir)) {
        console.warn(`Warning: Content directory does not exist: ${contentsDir}`);
    }

    const files = await getFiles(contentsDir);
    if (files.length === 0) {
        console.warn(`Warning: No files found to sync in content directory: ${contentsDir}`);
    }

    // Sort files to make sure index files or folder main entrypoints are chosen first
    files.sort((a, b) => {
        const aBase = path.basename(a).toLowerCase();
        const bBase = path.basename(b).toLowerCase();
        if (aBase.startsWith('index.')) return -1;
        if (bBase.startsWith('index.')) return 1;
        return a.localeCompare(b);
    });

    function findRoute(filesList, dirName, defaultVal) {
        const matchedFile = filesList.find(f => {
            const rel = path.relative(contentsDir, f);
            const parts = rel.split(path.sep);
            return parts[0] === 'docs' && parts[1] === dirName && (f.endsWith('.md') || f.endsWith('.mdx'));
        });
        if (!matchedFile) return defaultVal;
        const rel = path.relative(contentsDir, matchedFile);
        const parts = rel.split(path.sep).slice(1); // remove 'docs'
        const ext = path.extname(matchedFile);
        const base = parts.join('/');
        let route = '/' + base.substring(0, base.length - ext.length).toLowerCase() + '/';
        if (route.endsWith('/index/')) {
            route = route.substring(0, route.length - 6);
        }
        return route;
    }

    const depth1Dirs = new Set();
    const depth1Files = [];

    for (const f of files) {
        const relToDocs = path.relative(path.join(contentsDir, 'docs'), f);
        if (relToDocs.startsWith('..')) continue; // outside content/docs
        const parts = relToDocs.split(path.sep);
        if (parts.length === 1) {
            const ext = path.extname(f).toLowerCase();
            const base = parts[0];
            if (base !== 'index.mdx' && ['.md', '.mdx', '.markdown'].includes(ext)) {
                depth1Files.push(f);
            }
        } else {
            depth1Dirs.add(parts[0]);
        }
    }

    const sortedDirs = Array.from(depth1Dirs).sort();
    const sortedFiles = depth1Files.sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

    let generatedActions = '';
    for (const dir of sortedDirs) {
        const label = dir.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const link = findRoute(files, dir, '/' + dir + '/');
        const icon = (dir === 'eton' || dir === 'notes') ? 'open-book' : 'document';
        generatedActions += `    - text: "${label}"\n      link: ${link}\n      icon: ${icon}\n`;
    }
    for (const f of sortedFiles) {
        const ext = path.extname(f);
        const baseName = path.basename(f, ext);
        const label = baseName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const link = '/' + baseName.toLowerCase() + '/';
        generatedActions += `    - text: "${label}"\n      link: ${link}\n      icon: document\n`;
    }
    
    let hasIndexMdx = false;
    for (const file of files) {

        const relativePath = path.relative(contentsDir, file);
        console.log('Syncing file: ', relativePath);
        const parts = relativePath.split(path.sep);
        const isSlide = parts[0] === 'slides';
        
        let destPath;
        if (isSlide) {
             destPath = path.join(slidesDestDir, ...parts.slice(1));
        } else {
             destPath = path.join(docsDestDir, relativePath);
        }

        await fs.mkdir(path.dirname(destPath), { recursive: true });

        const ext = path.extname(file).toLowerCase();
        const validMdExts = ['.md', '.mdx', '.markdown', '.mdown', '.mkdn', '.mkd', '.mdwn'];

        let content = null;
        if (validMdExts.includes(ext)) {
            content = await fs.readFile(file, 'utf-8');
            
            // Clean content to avoid validating commented-out or code block references
            const cleanContent = content
                .replace(/<!--[\s\S]*?-->/g, '') // strip HTML comments
                .replace(/```[\s\S]*?```/g, '')  // strip block code
                .replace(/`[^`\n]+`/g, '');       // strip inline code
            
            // Check Markdown images: ![alt](path)
            const imgRegex = /!\[.*?\]\((.*?)\)/g;
            let match;
            while ((match = imgRegex.exec(cleanContent)) !== null) {
                const imgPath = match[1].split(' ')[0].trim();
                validateImage(imgPath, file, relativePath);
            }

            // Check HTML images: <img src="path" ... />
            const htmlImgRegex = /<img\s+[^>]*src=["']([^"']+)["']/g;
            while ((match = htmlImgRegex.exec(cleanContent)) !== null) {
                const imgPath = match[1].trim();
                validateImage(imgPath, file, relativePath);
            }
        }

        if (validMdExts.includes(ext) && !isSlide) {
            let hasTitle = false;
            
            // Very basic frontmatter parsing
            if (content.startsWith('---')) {
                const endIdx = content.indexOf('---', 3);
                if (endIdx !== -1) {
                    const frontmatter = content.substring(3, endIdx);
                    if (/^title\s*:/m.test(frontmatter)) {
                        hasTitle = true;
                    }
                }
            }

            if (!hasTitle) {
                // Try to find a heading
                const headingMatch = content.match(/^#\s+(.+)$/m);
                let title = 'Untitled Document';
                if (headingMatch && headingMatch[1]) {
                    title = headingMatch[1].trim();
                } else {
                    title = path.basename(file, ext);
                    // Capitalize default title based on filename
                    title = title.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                }

                // escape quotes
                title = title.replace(/"/g, '\\"');

                if (content.startsWith('---')) {
                    const endIdx = content.indexOf('---', 3);
                    if (endIdx !== -1) {
                        // inject title into existing frontmatter
                        content = content.slice(0, 3) + `\ntitle: "${title}"` + content.slice(3);
                    }
                } else {
                    // add frontmatter block
                    content = `---\ntitle: "${title}"\n---\n\n` + content;
                }
            }

            if (relativePath === 'docs' + path.sep + 'index.mdx' || relativePath === 'docs/index.mdx') {
                hasIndexMdx = true;
                const actionsMatch = content.match(/(\s+)actions:\s*\n([\s\S]*?)(?=---)/);
                if (actionsMatch) {
                    const indent = actionsMatch[1]; // should be '  '
                    const originalActionsStr = actionsMatch[2];
                    const actionBlocks = originalActionsStr.split(/(?=\s*-\s*text:)/g).filter(Boolean);
                    
                    const slidesActions = [];
                    const externalActions = [];
                    
                    for (const block of actionBlocks) {
                        const linkMatch = block.match(/link:\s*(\S+)/);
                        if (linkMatch) {
                            const link = linkMatch[1];
                            if (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('//')) {
                                externalActions.push(block);
                            } else if (link.startsWith('/slides')) {
                                slidesActions.push(block);
                            }
                        }
                    }
                    
                    let newActionsStr = `${indent}actions:\n`;
                    for (const action of slidesActions) {
                        newActionsStr += `    - text: Slides\n      link: /slides\n      icon: seti:video\n`;
                    }
                    newActionsStr += generatedActions;
                    for (const action of externalActions) {
                        const textMatch = action.match(/text:\s*(.+)/);
                        const linkMatch = action.match(/link:\s*(\S+)/);
                        const iconMatch = action.match(/icon:\s*(\S+)/);
                        if (textMatch && linkMatch && iconMatch) {
                            newActionsStr += `    - text: ${textMatch[1].trim()}\n      link: ${linkMatch[1].trim()}\n      icon: ${iconMatch[1].trim()}\n`;
                        }
                    }
                    
                    const fullOriginalActionsSection = indent + 'actions:\n' + originalActionsStr;
                    const updatedContent = content.replace(fullOriginalActionsSection, newActionsStr);
                    
                    if (updatedContent !== content) {
                        content = updatedContent;
                        // Also write it back to the source file to keep it updated in the repo!
                        await fs.writeFile(file, content, 'utf-8');
                        console.log('Successfully regenerated and updated index.mdx actions list.');
                    }
                }
            }

            await fs.writeFile(destPath, content, 'utf-8');
        } else {
            // just copy other files directly
            await fs.copyFile(file, destPath);
        }
    }

    if (hasSyncErrors) {
        console.error('\x1b[31mSync failed due to missing referenced images listed above.\x1b[0m');
        process.exit(1);
    }

    // Default base configuration
    const baseConfig = {
        title: 'My Docs!',
        customCss: [
            'src/styles/custom-bugfix.css',
        ]
    };

    let userConfig = {};
    const configJsonPath = path.join(contentsDir, 'starlight.config.json');
    if (existsSync(configJsonPath)) {
        try {
            userConfig = JSON.parse(await fs.readFile(configJsonPath, 'utf-8'));
        } catch (e) {
            console.warn('Failed to parse content/starlight.config.json:', e);
        }
    }

    // Generate dynamic sidebar items
    const sidebarItems = [];
    for (const dir of sortedDirs) {
        const label = dir.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        sidebarItems.push({
            label: label,
            autogenerate: { directory: dir }
        });
    }
    for (const f of sortedFiles) {
        const ext = path.extname(f);
        const baseName = path.basename(f, ext);
        const label = baseName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        sidebarItems.push({
            label: label,
            slug: baseName.toLowerCase()
        });
    }

    // Merge default, user config, and dynamic sidebar
    const mergedConfig = {
        ...baseConfig,
        ...userConfig,
        sidebar: userConfig.sidebar || sidebarItems
    };

    const configContent = `// Automatically generated by syncContent.mjs
export default ${JSON.stringify(mergedConfig, null, 2)};
`;
    const configPath = path.join(docsDestDir, 'docs', 'starlight.config.mjs');
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, configContent, 'utf-8');
    console.log('Successfully generated dynamic starlight.config.mjs sidebar config.');

    if (!hasIndexMdx) {
        const siteTagline = mergedConfig.tagline || (mergedConfig.hero && mergedConfig.hero.tagline) || 'Documentation Index';
        const defaultIndexContent = `---
title: Welcome to Starlight
template: splash
hero:
  tagline: ${siteTagline}
  actions:
    - text: Slides
      link: /slides
      icon: seti:video
${generatedActions.trimRight()}
---

import { Card, CardGrid } from '@astrojs/starlight/components';

## Getting Started

<CardGrid stagger>
	<Card title="Add new content" icon="add-document">
		Add Markdown or MDX files to your content directory to create new pages.
	</Card>
	<Card title="Read the docs" icon="open-book">
		Learn more in [the Starlight Docs](https://starlight.astro.build/).
	</Card>
</CardGrid>
`;
        const defaultIndexPath = path.join(docsDestDir, 'docs', 'index.mdx');
        await fs.mkdir(path.dirname(defaultIndexPath), { recursive: true });
        await fs.writeFile(defaultIndexPath, defaultIndexContent, 'utf-8');
        console.log('Successfully generated default index.mdx landing page.');
    }

    console.log('Sync complete.');
}

sync().catch(err => {
    console.error('Failed to sync contents:', err);
    process.exit(1);
});
