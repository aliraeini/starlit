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
    console.log('Sync complete.');
}

sync().catch(err => {
    console.error('Failed to sync contents:', err);
    process.exit(1);
});
