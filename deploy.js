#!/usr/bin/env node
import { program } from 'commander';
import { createInterface } from 'readline';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomBytes } from 'crypto';
import config from './config.json' with { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));

// Passwort-Generator (12 Zeichen, alphanumerisch)
function generatePassword(length = 12) {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

// SSH Keys als YAML-Array formatieren
function formatSshKeysYaml() {
  const keys = config.admin?.sshKeys || [];
  if (keys.length === 0) return '      # Keine SSH Keys konfiguriert';

  return keys
    .filter(k => k && !k.startsWith('#'))
    .map(k => `      - ${k}`)
    .join('\n');
}

// Prompt-Helper
function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Hetzner API Call
async function hetznerApi(method, endpoint, body = null) {
  const response = await fetch(`https://api.hetzner.cloud/v1${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${config.hetzner.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `API Error: ${response.status}`);
  }
  return data;
}

// Bestehende Server auflisten
async function listServers() {
  const result = await hetznerApi('GET', '/servers');
  return result.servers.filter(s => s.name.startsWith('coding-class-'));
}

// Server erstellen
async function createServer(kindname) {
  let cloudConfig = readFileSync(join(__dirname, 'cloud-config.yaml'), 'utf-8');

  // Passwörter generieren
  const passwords = {
    admin: generatePassword(),
    mentee: generatePassword(),
    vnc: generatePassword(8), // VNC Passwörter oft auf 8 Zeichen begrenzt
  };

  // Platzhalter ersetzen
  cloudConfig = cloudConfig
    .replace(/\{\{ADMIN_NAME\}\}/g, config.admin.name)
    .replace(/\{\{ADMIN_PASSWORD\}\}/g, passwords.admin)
    .replace(/\{\{MENTEE_PASSWORD\}\}/g, passwords.mentee)
    .replace(/\{\{VNC_PASSWORD\}\}/g, passwords.vnc)
    .replace(/\{\{SSH_AUTHORIZED_KEYS\}\}/g, formatSshKeysYaml());

  console.log(`\n🚀 Erstelle Server für ${kindname}...`);

  // Hetzner API Request vorbereiten
  const serverRequest = {
    name: `coding-class-${kindname}`,
    server_type: 'cx33',
    image: 'debian-12',
    location: 'nbg1',
    user_data: cloudConfig,
  };

  const result = await hetznerApi('POST', '/servers', serverRequest);

  result.passwords = passwords;
  return result;
}

// Server löschen
async function deleteServer(serverId) {
  await hetznerApi('DELETE', `/servers/${serverId}`);
}

// Validierung Kindname
function validateName(name) {
  if (!name || !/^[a-z]+$/.test(name)) {
    console.error('❌ Name muss aus Kleinbuchstaben bestehen (z.B. "max")');
    process.exit(1);
  }
  return name;
}

// Check Konfiguration
function checkConfig() {
  let missing = [];
  if (!config.hetzner?.apiToken || config.hetzner.apiToken === 'your-api-token-here') {
    missing.push('hetzner.apiToken');
  }
  if (!config.admin?.name || config.admin.name === 'your-admin-name') {
    missing.push('admin.name');
  }

  if (missing.length > 0) {
    console.error('❌ Fehlende Konfiguration: ' + missing.join(', '));
    console.error('   Bearbeite config.json und trage die Werte ein.');
    process.exit(1);
  }
}

// === Commands ===

program
  .name('deploy')
  .description('Coding Class - Server Deployment auf Hetzner Cloud')
  .version('1.0.0');

// List command
program
  .command('list')
  .alias('ls')
  .description('Zeigt alle Coding Class Server')
  .action(async () => {
    checkConfig();
    const servers = await listServers();

    if (servers.length === 0) {
      console.log('Keine Coding Class Server vorhanden.');
      return;
    }

    console.log('\n🖥️  Coding Class Server:\n');
    for (const server of servers) {
      const ip = server.public_net?.ipv4?.ip || 'pending';
      const name = server.name.replace('coding-class-', '');
      console.log(`  ${name}`);
      console.log(`    Status: ${server.status}`);
      console.log(`    IP: ${ip}`);
      console.log(`    RDP: open rdp://${name}@${ip}`);
      console.log('');
    }
  });

// Create command
program
  .command('create')
  .alias('new')
  .description('Erstellt einen neuen Server')
  .option('-n, --name <name>', 'Name des Kindes (Kleinbuchstaben)')
  .action(async (options) => {
    checkConfig();

    let kindname = options.name;

    if (!kindname) {
      kindname = await prompt('Wie heißt das Kind? ');
    }

    kindname = validateName(kindname.toLowerCase());

    // Prüfen ob Server schon existiert
    const servers = await listServers();
    const existing = servers.find(s => s.name === `coding-class-${kindname}`);
    if (existing) {
      console.log(`❌ Server "coding-class-${kindname}" existiert bereits!`);
      const ip = existing.public_net?.ipv4?.ip;
      if (ip) {
        console.log(`   RDP: open rdp://${kindname}@${ip}`);
      }
      process.exit(1);
    }

    try {
      const result = await createServer(kindname);
      const ip = result.server.public_net?.ipv4?.ip || 'wird zugewiesen...';
      const adminName = config.admin.name;

      console.log(`\n✅ Server erstellt!`);
      console.log(`\n⏳ Installation läuft (~10 Minuten), Server rebootet automatisch.\n`);
      console.log(`📋 Zugangsdaten:\n`);
      console.log(`   Kind (${kindname}):`);
      console.log(`     RDP: open rdp://${kindname}@${ip}`);
      console.log(`     Passwort: ${result.passwords.mentee}`);
      console.log(`\n   Admin (${adminName}):`);
      console.log(`     SSH: ssh ${adminName}@${ip}`);
      console.log(`     Passwort: ${result.passwords.admin}`);
      console.log(`\n   VNC (Screen Sharing):`);
      console.log(`     VNC: open vnc://${ip}:5900`);
      console.log(`     Passwort: ${result.passwords.vnc}`);

    } catch (error) {
      console.error(`\n❌ Fehler: ${error.message}`);
      process.exit(1);
    }
  });

// Delete command
program
  .command('delete')
  .alias('rm')
  .description('Löscht einen Server')
  .option('-n, --name <name>', 'Name des Kindes')
  .option('-f, --force', 'Ohne Bestätigung löschen')
  .action(async (options) => {
    checkConfig();

    const servers = await listServers();

    if (servers.length === 0) {
      console.log('Keine Server zum Löschen vorhanden.');
      return;
    }

    let kindname = options.name;

    if (!kindname) {
      console.log('\nVorhandene Server:');
      for (const s of servers) {
        console.log(`  • ${s.name.replace('coding-class-', '')}`);
      }
      kindname = await prompt('\nWelchen Server löschen? ');
    }

    kindname = kindname.toLowerCase();
    const server = servers.find(s => s.name === `coding-class-${kindname}`);

    if (!server) {
      console.log(`❌ Server "coding-class-${kindname}" nicht gefunden.`);
      process.exit(1);
    }

    if (!options.force) {
      const confirm = await prompt(`Wirklich ${server.name} löschen? [j/n]: `);
      if (confirm !== 'j' && confirm !== 'ja') {
        console.log('Abgebrochen.');
        return;
      }
    }

    await deleteServer(server.id);
    console.log(`✅ ${server.name} gelöscht.`);
  });

// Default action (no command)
program
  .action(async () => {
    checkConfig();

    console.log('🖥️  Coding Class - Server Deployment\n');

    const servers = await listServers();
    if (servers.length > 0) {
      console.log('Bestehende Server:');
      for (const server of servers) {
        const ip = server.public_net?.ipv4?.ip || 'pending';
        console.log(`  • ${server.name.replace('coding-class-', '')} (${server.status}) - ${ip}`);
      }
      console.log('');
    }

    console.log('Befehle:');
    console.log('  npm run deploy create --name <kind>  Neuen Server erstellen');
    console.log('  npm run deploy delete --name <kind>  Server löschen');
    console.log('  npm run deploy list                  Alle Server anzeigen');
    console.log('');
  });

program.parse();
