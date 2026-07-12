const fs = require('fs');

const transcriptPath = 'C:\\Users\\lilym\\.gemini\\antigravity\\brain\\8e3907df-9d77-4c87-9c44-678cb59a8fe3\\.system_generated\\logs\\transcript_full.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n');

const files = {};

for (const line of lines) {
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.tool_calls) {
      for (const tc of obj.tool_calls) {
        if (tc.name === 'write_to_file' || tc.name === 'multi_replace_file_content' || tc.name === 'replace_file_content') {
          const targetFile = tc.args.TargetFile;
          if (!targetFile) continue;
          if (!targetFile.includes('floxync.com')) continue;
          
          if (!files[targetFile]) files[targetFile] = [];
          files[targetFile].push(tc);
        }
      }
    }
  } catch(e) {}
}

for (const [file, calls] of Object.entries(files)) {
  console.log(`\n=================\nFILE: ${file}\n`);
  for (const tc of calls) {
    console.log(`TOOL: ${tc.name}`);
    if (tc.name === 'write_to_file') {
      console.log('--- CONTENT START ---');
      console.log(tc.args.CodeContent.substring(0, 200) + '...');
      console.log('--- CONTENT END ---');
    } else {
      console.log('--- CHUNKS START ---');
      console.log(JSON.stringify(tc.args.ReplacementChunks || tc.args, null, 2).substring(0, 300) + '...');
      console.log('--- CHUNKS END ---');
    }
  }
}
