import fs from 'fs/promises';
import path from 'path';

const textExtensions = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.sql', '.html', '.css',
  '.txt', '.env', '.env.local', '.env.example', '.env.production', '.yml', '.yaml'
]);

const skipDirs = new Set(['node_modules', '.git', '.next', 'out', 'dist', 'build', '.cache']);

const replacements = [
  { regex: /FloraSync/g, to: 'Floxync' },
  { regex: /Florasync/g, to: 'Floxync' },
  { regex: /florasync/g, to: 'floxync' },
  { regex: /FLORASYNC/g, to: 'FLOXYNC' },
  { regex: /Flora-sync/g, to: 'Floxync' },
  { regex: /flora-sync/g, to: 'floxync' },
  { regex: /Floasync/g, to: 'Floxync' },
  { regex: /floasync/g, to: 'floxync' },
  { regex: /FLOASYNC/g, to: 'FLOXYNC' },
  { regex: /플로라싱크/g, to: '플록싱크' },
];

async function replaceInFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    // Exclude images, etc. If it's a known text file or has no extension (and is not binary, though hard to know)
    if (!textExtensions.has(ext)) {
      if (ext !== '') return; // Skip non-text extensions
    }

    const content = await fs.readFile(filePath, 'utf8');
    let newContent = content;
    
    for (const { regex, to } of replacements) {
      newContent = newContent.replace(regex, to);
    }

    if (newContent !== content) {
      await fs.writeFile(filePath, newContent, 'utf8');
      console.log(`Updated content: ${filePath}`);
    }
  } catch (err) {
    if (err.message.includes('EBUSY') || err.message.includes('ENOENT') || err.message.includes('EISDIR')) {
      // Ignore some errors
    } else {
      console.error(`Error processing file ${filePath}:`, err);
    }
  }
}

async function renameIfMatches(itemPath) {
  const name = path.basename(itemPath);
  let newName = name;
  for (const { regex, to } of replacements) {
    newName = newName.replace(regex, to);
  }
  
  if (newName !== name) {
    const newPath = path.join(path.dirname(itemPath), newName);
    try {
      await fs.rename(itemPath, newPath);
      console.log(`Renamed: ${itemPath} -> ${newPath}`);
      return newPath; // Return new path so traversal can continue correctly if it was a directory
    } catch (err) {
      console.error(`Error renaming ${itemPath}:`, err);
      return itemPath;
    }
  }
  return itemPath;
}

async function walk(dirPath) {
  let items;
  try {
    items = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    return;
  }

  // Iterate over children first (bottom-up approach for renaming)
  for (const item of items) {
    if (skipDirs.has(item.name)) continue;
    
    let fullPath = path.join(dirPath, item.name);
    
    if (item.isDirectory()) {
      await walk(fullPath);
    } else if (item.isFile()) {
      await replaceInFile(fullPath);
      await renameIfMatches(fullPath);
    }
  }

  // Rename the directory itself after its children have been processed
  if (dirPath !== process.cwd() && items.length > 0) {
    // Only try to rename the directory if we are not at root 
    await renameIfMatches(dirPath);
  }
}

async function main() {
  const root = 'd:\\mapp\\florasync-saas';
  console.log(`Starting refactoring in ${root}...`);
  await walk(root);
  console.log('Finished refactoring.');
}

main().catch(console.error);
