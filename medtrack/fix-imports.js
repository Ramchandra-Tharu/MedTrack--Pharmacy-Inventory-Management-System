const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = content;
            
            updated = updated.replace(/import\s+Medicine\s+from\s+["']@\/lib\/models\/Medicine["']/g, 'import { Medicine } from "@/lib/models/Medicine"');
            updated = updated.replace(/import\s+Batch\s+from\s+["']@\/lib\/models\/Batch["']/g, 'import { Batch } from "@/lib/models/Batch"');
            updated = updated.replace(/import\s+Sale\s+from\s+["']@\/lib\/models\/Sale["']/g, 'import { Sale } from "@/lib/models/Sale"');
            
            if (updated !== content) {
                fs.writeFileSync(fullPath, updated, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDir(path.join(__dirname, 'src', 'app', 'api'));
