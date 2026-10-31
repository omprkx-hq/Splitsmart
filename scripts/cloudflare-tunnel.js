/**
 * SplitSmart - Cloudflare Instant Global Deployment Helper
 * Launches a secure Cloudflare Tunnel pointing to SplitSmart on port 5000
 * Gives a public HTTPS URL (e.g. https://xxx.trycloudflare.com) accessible anywhere globally.
 */

const { spawn } = require('child_process');

console.log('🚀 [CLOUDFLARE] Initializing Cloudflare Global Access Tunnel for SplitSmart...');
console.log('📍 Target Local Port: http://localhost:5000');

// Run cloudflared via local package
const child = spawn('npx', ['cloudflared', 'tunnel', '--url', 'http://localhost:5000'], {
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe']
});

let publicUrlFound = false;

function handleOutput(data) {
    const text = data.toString();
    process.stdout.write(text);

    // Look for trycloudflare.com link
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !publicUrlFound) {
        publicUrlFound = true;
        const publicUrl = match[0];

        // Automatically sync into .env
        try {
            const fs = require('fs');
            const path = require('path');
            const envPath = path.join(__dirname, '..', '.env');
            if (fs.existsSync(envPath)) {
                let envText = fs.readFileSync(envPath, 'utf8');
                if (envText.includes('PUBLIC_APP_URL=')) {
                    envText = envText.replace(/PUBLIC_APP_URL=.*$/m, `PUBLIC_APP_URL=${publicUrl}`);
                } else {
                    envText += `\nPUBLIC_APP_URL=${publicUrl}`;
                }
                if (envText.includes('APP_URL=')) {
                    envText = envText.replace(/APP_URL=.*$/m, `APP_URL=${publicUrl}`);
                } else {
                    envText += `\nAPP_URL=${publicUrl}`;
                }
                fs.writeFileSync(envPath, envText, 'utf8');
            }
        } catch (_) {}

        console.log('\n=============================================================');
        console.log('🎉 SPLITSMART IS LIVE GLOBALLY ON CLOUDFLARE:');
        console.log(`🌐 Public HTTPS URL: ${publicUrl}`);
        console.log('Anyone anywhere in the world can open this link on phone or PC!');
        console.log('=============================================================\n');
    }
}

child.stdout.on('data', handleOutput);
child.stderr.on('data', handleOutput);

child.on('error', (err) => {
    console.error('❌ Cloudflare Tunnel launch error:', err.message);
});

child.on('exit', (code) => {
    console.log(`Cloudflare Tunnel exited with code ${code}`);
});

