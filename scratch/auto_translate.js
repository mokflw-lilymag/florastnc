const fs = require('fs');
const path = require('path');
const translate = require('google-translate-api-x');

const dir = 'D:/mapp/florasync-saas/src/i18n/messages';

// Helper to check if a string is actually translatable (has English letters)
const isTranslatable = (text) => typeof text === 'string' && /[a-zA-Z]/.test(text) && !/^[A-Z0-9_]+$/.test(text);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const traverseAndCollect = (baseObj, targetObj, pathArr, collection) => {
    for (const key of Object.keys(baseObj)) {
        const baseVal = baseObj[key];
        const targetVal = targetObj[key];
        const currentPath = [...pathArr, key];
        
        if (typeof baseVal === 'object' && baseVal !== null && !Array.isArray(baseVal)) {
            if (!targetObj[key]) targetObj[key] = {};
            traverseAndCollect(baseVal, targetObj[key], currentPath, collection);
        } else if (typeof baseVal === 'string') {
            if (targetVal === undefined || (baseVal === targetVal && isTranslatable(baseVal))) {
                // If it looks like a proper noun like 'KakaoLabel', let's skip
                if (key.includes('Label') && key.startsWith('kakao')) {
                    if (targetVal === undefined) targetObj[key] = baseVal;
                    continue;
                }
                collection.push({ path: currentPath, text: baseVal });
            }
        } else {
            if (targetObj[key] === undefined) {
                targetObj[key] = baseVal;
            }
        }
    }
};

const setValueAtPath = (obj, pathArr, value) => {
    let current = obj;
    for (let i = 0; i < pathArr.length - 1; i++) {
        if (!current[pathArr[i]]) current[pathArr[i]] = {};
        current = current[pathArr[i]];
    }
    current[pathArr[pathArr.length - 1]] = value;
};

const processFile = async (baseFileName, targetFileName, langTo) => {
    const basePath = path.join(dir, baseFileName);
    const targetPath = path.join(dir, targetFileName);
    
    let baseObj = JSON.parse(fs.readFileSync(basePath, 'utf8'));
    let targetObj = {};
    
    if (fs.existsSync(targetPath)) {
        targetObj = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    } else {
        console.log(`Creating new file: ${targetFileName}`);
    }
    
    console.log(`\nProcessing ${targetFileName} for language ${langTo}...`);
    
    const collection = [];
    traverseAndCollect(baseObj, targetObj, [], collection);
    
    if (collection.length === 0) {
        console.log(`👍 No translations needed for ${targetFileName}`);
        return;
    }
    
    console.log(`Found ${collection.length} items to translate. Batching...`);
    
    // Batch size of 100 texts at a time
    const batchSize = 100;
    for (let i = 0; i < collection.length; i += batchSize) {
        const batch = collection.slice(i, i + batchSize);
        const textsToTranslate = batch.map(b => b.text);
        
        try {
            console.log(`Translating batch ${i} to ${i + batch.length} of ${collection.length}...`);
            const results = await translate(textsToTranslate, { 
                to: langTo, 
                forceTo: true,
                rejectOnPartialFail: false
            });
            // Results is an array if multiple texts, or single object if one text
            const resArray = Array.isArray(results) ? results : [results];
            
            for (let j = 0; j < batch.length; j++) {
                const translatedText = resArray[j] && resArray[j].text ? resArray[j].text : batch[j].text;
                setValueAtPath(targetObj, batch[j].path, translatedText);
            }
            await sleep(500); // 500ms delay between batches
        } catch (e) {
            console.error(`Error translating batch:`, e.message);
            // Fallback: copy original on failure
            for (let j = 0; j < batch.length; j++) {
                setValueAtPath(targetObj, batch[j].path, batch[j].text);
            }
        }
    }
    
    fs.writeFileSync(targetPath, JSON.stringify(targetObj, null, 2), 'utf8');
    console.log(`✅ Saved translations to ${targetFileName}`);
};

const main = async () => {
    console.log("Starting batch translation process...");
    
    // NL updates
    await processFile('ribbon-phrase-desc-en.json', 'ribbon-phrase-desc-nl.json', 'nl');
    
    // IT updates
    await processFile('en.json', 'it.json', 'it');
    await processFile('dashboard-en.json', 'dashboard-it.json', 'it');
    await processFile('ribbon-phrase-desc-en.json', 'ribbon-phrase-desc-it.json', 'it');
    
    // HI updates
    await processFile('en.json', 'hi.json', 'hi');
    await processFile('dashboard-en.json', 'dashboard-hi.json', 'hi');
    await processFile('ribbon-phrase-desc-en.json', 'ribbon-phrase-desc-hi.json', 'hi');
    
    // AR updates
    await processFile('en.json', 'ar.json', 'ar');
    await processFile('dashboard-en.json', 'dashboard-ar.json', 'ar');
    await processFile('ribbon-phrase-desc-en.json', 'ribbon-phrase-desc-ar.json', 'ar');
    
    console.log("\nTranslation process complete!");
};

main();
