#!/usr/bin/env node
import 'dotenv/config';
import { createInterface } from 'readline';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
      'Authorization': `Bearer ${process.env.HETZNER_API_TOKEN}`,
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

// Server erstellen
async function createServer(kindname) {
  const cloudConfig = readFileSync(join(__dirname, 'cloud-config.yaml'), 'utf-8');

  console.log(`\n🚀 Erstelle Server für ${kindname}...`);

  const result = await hetznerApi('POST', '/servers', {
    name: `coding-class-${kindname}`,
    server_type: 'cx22',
    image: 'debian-12',
    location: 'nbg1',
    ssh_keys: [105159908], // claude-debug key
    user_data: cloudConfig,
  });

  return result;
}

// Bestehende Server auflisten
async function listServers() {
  const result = await hetznerApi('GET', '/servers');
  return result.servers.filter(s => s.name.startsWith('coding-class-'));
}

// Server löschen
async function deleteServer(serverId) {
  await hetznerApi('DELETE', `/servers/${serverId}`);
}

// Hauptprogramm
async function main() {
  if (!process.env.HETZNER_API_TOKEN) {
    console.error('❌ HETZNER_API_TOKEN nicht gesetzt!');
    console.error('   Kopiere .env.example nach .env und trage deinen Hetzner API Token ein.');
    process.exit(1);
  }

  console.log('🖥️  Coding Class - Server Deployment\n');

  // Bestehende Server anzeigen
  const servers = await listServers();
  if (servers.length > 0) {
    console.log('Bestehende Coding Class Server:');
    for (const server of servers) {
      const ip = server.public_net?.ipv4?.ip || 'pending';
      console.log(`  • ${server.name} (${server.status}) - ${ip}`);
    }
    console.log('');
  }

  // Aktion wählen
  const action = await prompt('Was möchtest du tun? [n]eu / [l]öschen / [q]uit: ');

  if (action === 'q' || action === 'quit') {
    console.log('Bye! 👋');
    return;
  }

  if (action === 'l' || action === 'löschen') {
    if (servers.length === 0) {
      console.log('Keine Server zum Löschen vorhanden.');
      return;
    }

    const name = await prompt('Welchen Server löschen? (Name ohne "coding-class-"): ');
    const server = servers.find(s => s.name === `coding-class-${name}`);

    if (!server) {
      console.log(`❌ Server "coding-class-${name}" nicht gefunden.`);
      return;
    }

    const confirm = await prompt(`Wirklich ${server.name} löschen? [j/n]: `);
    if (confirm === 'j' || confirm === 'ja') {
      await deleteServer(server.id);
      console.log(`✅ ${server.name} gelöscht.`);
    } else {
      console.log('Abgebrochen.');
    }
    return;
  }

  // Neuen Server erstellen
  const kindname = await prompt('Wie heißt das Kind? ');

  if (!kindname || !/^[a-z]+$/.test(kindname)) {
    console.log('❌ Name muss aus Kleinbuchstaben bestehen (z.B. "friedrich")');
    process.exit(1);
  }

  // Prüfen ob Server schon existiert
  const existing = servers.find(s => s.name === `coding-class-${kindname}`);
  if (existing) {
    console.log(`❌ Server "coding-class-${kindname}" existiert bereits!`);
    const ip = existing.public_net?.ipv4?.ip;
    if (ip) {
      console.log(`   RDP: ${ip}:3389 (${kindname} / codingclass)`);
    }
    return;
  }

  try {
    const result = await createServer(kindname);
    const ip = result.server.public_net?.ipv4?.ip || 'wird zugewiesen...';

    console.log(`\n✅ Server erstellt!`);
    console.log(`   Name: coding-class-${kindname}`);
    console.log(`   IP: ${ip}`);
    console.log(`\n⏳ Installation läuft (~10 Minuten), Server rebootet automatisch.`);
    console.log(`\n📋 Zugangsdaten:`);
    console.log(`   RDP: ${ip}:3389`);
    console.log(`   User: ${kindname}`);
    console.log(`   Passwort: codingclass`);
    console.log(`\n   VNC (Screen Sharing): vnc://${ip}:5900`);
    console.log(`   VNC Passwort: codingclass`);
    console.log(`\n   SSH: ssh levin@${ip}`);

  } catch (error) {
    console.error(`\n❌ Fehler: ${error.message}`);
    process.exit(1);
  }
}

main();
