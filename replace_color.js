const fs = require('fs');
const path = require('path');

function replaceColorInDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            replaceColorInDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.match(/#bc36ad/gi)) {
                content = content.replace(/#bc36ad/gi, '#0035a0');
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

replaceColorInDir(path.join(__dirname, 'src', 'screens', 'jobs'));
console.log('Done replacing colors.');
