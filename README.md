# Coding Class - Cloud Config

Cloud-init Konfiguration zum Deployen von Entwicklungs-VMs für die Mentees der [Coding Class](https://coding-class.levinkeller.de).

## Was ist das?

Die Coding Class ist ein Programmierkurs für Kinder, die mit professionellen Tools (Git, VS Code, etc.) programmieren lernen. Dieses Repository enthält die Konfiguration, um automatisch fertige Linux-Desktops auf Hetzner Cloud zu erstellen, auf die sich die Kinder per Remote Desktop verbinden können.

## Features

- **Debian 12 + XFCE** - Schnell und schlank, keine Snap-Bloatware
- **RDP-Zugang** für die Kinder
- **VNC Screen-Sharing** - Levin kann sich auf die Session schalten um zu helfen
- **Vorinstalliert**: VS Code, Firefox, Git, Python
- **Automatisches Setup** - Kind-Account wird aus dem Hostnamen erstellt

## Verwendung

### 1. Server erstellen

```bash
# .env mit Hetzner API Token laden
source .env

# Server deployen (Name = Kind-Account!)
jq -n \
  --arg name "coding-class-<kindname>" \
  --rawfile user_data cloud-config.yaml \
  '{name: $name, server_type: "cx33", image: "debian-12", location: "nbg1", ssh_keys: [105159908], user_data: $user_data}' \
| curl -X POST -H "Authorization: Bearer $HETZNER_API_TOKEN" -H "Content-Type: application/json" -d @- "https://api.hetzner.cloud/v1/servers"
```

### 2. Warten (~10 Minuten)

Der Server installiert automatisch alle Pakete und rebootet.

### 3. Verbinden

| Zugang | Adresse | Credentials |
|--------|---------|-------------|
| Kind (RDP) | `<ip>:3389` | `<kindname>` / `codingclass` |
| Levin (VNC) | `vnc://<ip>:5900` | Passwort: `codingclass` |
| Levin (SSH) | `ssh levin@<ip>` | `levin` / `levin` |

## Dateien

- `cloud-config.yaml` - Die cloud-init Konfiguration
- `claude.md` - Notizen für Claude (AI Assistant)
- `.env` - Hetzner API Token (gitignored)

## Anforderungen

- Hetzner Cloud Account
- API Token in `.env`
