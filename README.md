# Coding Class - Cloud Config

Cloud-init Konfiguration zum Deployen von Entwicklungs-VMs für die Mentees der [Coding Class](https://coding-class.levinkeller.de).

## Was ist das?

Die Coding Class ist ein Programmierkurs für Kinder, die mit professionellen Tools (Git, VS Code, etc.) programmieren lernen. Dieses Repository enthält die Konfiguration, um automatisch fertige Linux-Desktops auf Hetzner Cloud zu erstellen, auf die sich die Kinder per Remote Desktop verbinden können.

## Features

- **Debian 12 + XFCE** - Schnell und schlank, keine Snap-Bloatware
- **RDP-Zugang** für die Kinder
- **VNC Screen-Sharing** - Der Mentor kann sich auf die Session schalten um zu helfen
- **Vorinstalliert**: VS Code, Firefox, Git, Python
- **Automatisches Setup** - Kind-Account wird aus dem Hostnamen erstellt
- **Auto-generierte Passwörter** - Sichere, zufällige Passwörter bei jedem Deploy

## Verwendung

### 1. Setup

```bash
# .env.example kopieren und ausfüllen
cp .env.example .env

# In .env eintragen:
# - HETZNER_API_TOKEN: Dein Hetzner Cloud API Token
# - ADMIN_NAME: Name des Admin-Accounts (z.B. "levin")

# Dependencies installieren
npm install
```

### 2. Server erstellen

```bash
npm run deploy create --name <kindname>
```

Das Script generiert automatisch sichere Passwörter und zeigt sie am Ende an.

### 3. Warten (~10 Minuten)

Der Server installiert automatisch alle Pakete und rebootet.

### 4. Verbinden

Die Zugangsdaten werden nach dem Erstellen angezeigt:
- **Kind (RDP)**: `<ip>:3389` mit generiertem Passwort
- **Admin (VNC)**: `vnc://<ip>:5900` mit generiertem Passwort
- **Admin (SSH)**: `ssh <admin>@<ip>` mit generiertem Passwort

## CLI Befehle

```bash
npm run deploy list          # Alle Server anzeigen
npm run deploy create        # Neuen Server erstellen
npm run deploy delete        # Server löschen
```

## Dateien

- `cloud-config.yaml` - Die cloud-init Template-Konfiguration
- `deploy.js` - CLI zum Erstellen/Verwalten von Servern
- `.env` - Konfiguration (gitignored)

## Anforderungen

- Node.js
- Hetzner Cloud Account
- API Token und Admin-Name in `.env`
