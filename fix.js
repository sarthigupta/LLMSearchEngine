import fs from 'fs';
import path from 'path';

function walk(dir) {
    let files = fs.readdirSync(dir);
    for (let f of files) {
        let p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.js')) {
            let src = fs.readFileSync(p, 'utf8');
            if (src.includes('ctx.shouldStop()') && !src.includes('await ctx.shouldStop()')) {
                fs.writeFileSync(p, src.replace(/ctx\.shouldStop\(\)/g, 'await ctx.shouldStop()'));
            }
        }
    }
}
walk('./src');
