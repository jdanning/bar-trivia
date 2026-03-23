import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { config } from '../config';

let tunnelProcess: ChildProcess | null = null;
let tunnelUrl = '';
let tunnelStatus: 'starting' | 'connected' | 'error' = 'starting';
let tunnelError = '';

const CLOUDFLARED_PATHS = [
  process.env.CLOUDFLARED_PATH,
  path.join(process.env.USERPROFILE || '', 'Downloads', 'cloudflared-windows-amd64.exe'),
  'cloudflared',
].filter(Boolean) as string[];

export function getTunnelState() {
  return { url: tunnelUrl, status: tunnelStatus, error: tunnelError };
}

export function startTunnel(): Promise<string> {
  return new Promise((resolve) => {
    const cloudflaredPath = CLOUDFLARED_PATHS[0];

    console.log(`Starting Cloudflare tunnel... (using: ${cloudflaredPath})`);
    tunnelStatus = 'starting';
    tunnelError = '';

    try {
      tunnelProcess = spawn(cloudflaredPath, [
        'tunnel', '--url', `http://localhost:${config.port}`,
      ], { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err: any) {
      tunnelStatus = 'error';
      tunnelError = `Failed to start cloudflared: ${err.message}`;
      console.error(tunnelError);
      resolve('');
      return;
    }

    const urlRegex = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;
    let resolved = false;

    function handleData(data: Buffer) {
      const line = data.toString();
      const match = line.match(urlRegex);
      if (match && !resolved) {
        resolved = true;
        tunnelUrl = match[0];
        tunnelStatus = 'connected';
        config.publicUrl = tunnelUrl;
        console.log(`Cloudflare tunnel ready: ${tunnelUrl}`);
        resolve(tunnelUrl);
      }
    }

    tunnelProcess.stdout?.on('data', handleData);
    tunnelProcess.stderr?.on('data', handleData);

    tunnelProcess.on('error', (err) => {
      tunnelStatus = 'error';
      tunnelError = `cloudflared error: ${err.message}`;
      console.error(tunnelError);
      if (!resolved) { resolved = true; resolve(''); }
    });

    tunnelProcess.on('exit', (code) => {
      if (tunnelStatus === 'connected') {
        tunnelStatus = 'error';
        tunnelError = 'Tunnel process exited unexpectedly';
      }
      console.log(`cloudflared exited with code ${code}`);
    });

    // Timeout after 30s
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        tunnelStatus = 'error';
        tunnelError = 'Timed out waiting for tunnel URL';
        console.error(tunnelError);
        resolve('');
      }
    }, 30000);
  });
}

export function stopTunnel() {
  if (tunnelProcess) {
    tunnelProcess.kill();
    tunnelProcess = null;
    tunnelUrl = '';
    tunnelStatus = 'starting';
    config.publicUrl = '';
  }
}
