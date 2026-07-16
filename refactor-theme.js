import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath, callback);
    } else {
      if (fullPath.endsWith('.jsx')) {
        callback(fullPath);
      }
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Backgrounds
  content = content.replace(/\bbg-slate-950\b/g, 'bg-slate-50 dark:bg-slate-950');
  content = content.replace(/\bbg-slate-900\b/g, 'bg-white dark:bg-slate-900');
  content = content.replace(/\bbg-slate-800\b/g, 'bg-slate-100 dark:bg-slate-800');
  content = content.replace(/\bhover:bg-slate-900\b/g, 'hover:bg-slate-100 dark:hover:bg-slate-900');
  content = content.replace(/\bhover:bg-slate-800\b/g, 'hover:bg-slate-200 dark:hover:bg-slate-800');
  content = content.replace(/\bhover:bg-slate-700\b/g, 'hover:bg-slate-300 dark:hover:bg-slate-700');
  
  // Borders
  content = content.replace(/\bborder-slate-900\b/g, 'border-slate-300 dark:border-slate-900');
  content = content.replace(/\bborder-slate-800\b/g, 'border-slate-200 dark:border-slate-800');
  content = content.replace(/\bborder-slate-700\b/g, 'border-slate-300 dark:border-slate-700');

  // Text colors
  content = content.replace(/\btext-slate-500\b/g, 'text-slate-500 dark:text-slate-500'); 
  content = content.replace(/\btext-slate-400\b/g, 'text-slate-500 dark:text-slate-400');
  content = content.replace(/\btext-slate-450\b/g, 'text-slate-500 dark:text-slate-450');
  content = content.replace(/\btext-slate-300\b/g, 'text-slate-700 dark:text-slate-300');
  content = content.replace(/\btext-slate-200\b/g, 'text-slate-800 dark:text-slate-200');
  content = content.replace(/\btext-slate-100\b/g, 'text-slate-900 dark:text-slate-100');
  
  content = content.replace(/\btext-white\b/g, 'text-slate-900 dark:text-white');

  // Second pass to fix colored backgrounds
  // We find className strings and if they have bg-blue, bg-red, etc., we revert the text color.
  content = content.replace(/className=(["'{`])([\s\S]*?)(["'`}])/g, (match, openQuote, classList, closeQuote) => {
    if (/(bg-blue-|bg-red-|bg-emerald-|bg-pink-|bg-indigo-|bg-purple-|bg-gradient-to)/.test(classList)) {
      const fixed = classList.replace(/text-slate-900 dark:text-white/g, 'text-white');
      return `className=${openQuote}${fixed}${closeQuote}`;
    }
    return match;
  });
  
  // Fix gradients
  content = content.replace(/\bfrom-slate-950\b/g, 'from-slate-50 dark:from-slate-950');
  content = content.replace(/\bto-slate-900\b/g, 'to-white dark:to-slate-900');

  fs.writeFileSync(filePath, content, 'utf8');
}

// Process React files
walk('./src', processFile);

// Process index.html separately
const htmlPath = './index.html';
if (fs.existsSync(htmlPath)) {
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');
  htmlContent = htmlContent.replace(/\bbg-slate-950\b/g, 'bg-slate-50 dark:bg-slate-950');
  htmlContent = htmlContent.replace(/\btext-slate-100\b/g, 'text-slate-900 dark:text-slate-100');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
}

console.log('Refactor complete.');
