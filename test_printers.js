const { exec } = require('child_process');
exec('powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Get-Printer).Name | ConvertTo-Json -Compress"', { encoding: 'utf8' }, (err, stdout) => {
  console.log('EXEC UTF8:', stdout);
});
