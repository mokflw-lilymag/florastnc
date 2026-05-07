const fs = require('fs');
const path = require('path');
const dir = 'D:/mapp/florasync-saas/src/i18n/messages';

const flattenObj = (ob) => {
    let result = {};
    for (const i in ob) {
        if ((typeof ob[i]) === 'object' && !Array.isArray(ob[i])) {
            const temp = flattenObj(ob[i]);
            for (const j in temp) {
                result[i + '.' + j] = temp[j];
            }
        } else {
            result[i] = ob[i];
        }
    }
    return result;
};

const compare = (base, target) => {
    try {
        const baseContent = JSON.parse(fs.readFileSync(path.join(dir, base), 'utf8'));
        const targetContent = JSON.parse(fs.readFileSync(path.join(dir, target), 'utf8'));
        
        const baseFlat = flattenObj(baseContent);
        const targetFlat = flattenObj(targetContent);
        
        const baseKeys = Object.keys(baseFlat);
        const targetKeys = Object.keys(targetFlat);
        
        const missing = baseKeys.filter(k => !targetKeys.includes(k));
        const extra = targetKeys.filter(k => !baseKeys.includes(k));
        
        console.log(`\n=== Comparing ${base} -> ${target} ===`);
        console.log(`Missing keys in ${target} (${missing.length}):`);
        if (missing.length > 0) {
            console.log(missing.slice(0, 10).join('\n') + (missing.length > 10 ? '\n...and more' : ''));
        } else {
            console.log('None! All keys present.');
        }
        
        // Also check if any translations are empty or match the english version exactly (might be untranslated)
        const possibleUntranslated = baseKeys.filter(k => targetKeys.includes(k) && baseFlat[k] === targetFlat[k] && typeof baseFlat[k] === 'string' && /[a-zA-Z]/.test(baseFlat[k]));
        
        console.log(`Possibly untranslated (matches base) (${possibleUntranslated.length}):`);
        if (possibleUntranslated.length > 0) {
            console.log(possibleUntranslated.slice(0, 10).join('\n') + (possibleUntranslated.length > 10 ? '\n...and more' : ''));
        } else {
            console.log('None!');
        }
        
    } catch(e) {
        console.log(`Error checking ${base} and ${target}: ${e.message}`);
    }
}

['en.json', 'dashboard-en.json', 'ribbon-phrase-desc-en.json'].forEach(base => {
    const jaTarget = base.replace('en', 'ja');
    const zhTarget = base.replace('en', 'zh');
    compare(base, jaTarget);
    compare(base, zhTarget);
});
