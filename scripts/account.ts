import { createClient } from '@libsql/client';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { runAccountCli } from './lib/account-cli';

function loadDotEnv(): Record<string, string> {
  const envPath = join(process.cwd(), '.env');
  const vars: Record<string, string> = {};
  if (!existsSync(envPath)) return vars;
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) vars[key] = rest.join('=').replace(/['"]/g, '');
  }
  return vars;
}

function readLine(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/** Reads a line from the TTY without echoing it. */
function readPassword(prompt: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    return Promise.reject(
      new Error('No hay terminal interactiva: define ACCOUNT_PASSWORD para uso no interactivo.')
    );
  }
  return new Promise((resolve, reject) => {
    process.stdout.write(prompt);
    let value = '';
    const finish = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      process.stdout.write('\n');
    };
    const onData = (chunk: Buffer) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\r' || char === '\n' || char === '\u0004') {
          finish();
          return resolve(value);
        }
        if (char === '\u0003') {
          finish();
          return reject(new Error('Operación cancelada.'));
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

runAccountCli({
  argv: process.argv.slice(2),
  env: process.env,
  cwd: process.cwd(),
  loadDotEnv,
  openClient: (url, authToken) => createClient({ url, authToken }),
  readPassword,
  readLine,
  out: (line) => console.log(line),
  err: (line) => console.error(line),
}).then((code) => process.exit(code));
