# Coding Class - Cloud Config

## Projektbeschreibung

Dieses Repository verwaltet die `cloud-config.yaml` für die **Coding Class** von Levin Keller.

Die Coding Class ist ein Programmierkurs für Kinder, die "wie echte Entwickler" arbeiten sollen - mit Git, GitHub, VS Code und professionellen Tools statt spielerischer Anfängerprogramme. Der Kurs richtet sich vorrangig an Kinder aus dem persönlichen Umfeld des Kursleiters.

**Webseite:** https://coding-class.levinkeller.de

## Zweck dieser Cloud-Config

Die `cloud-config.yaml` erstellt automatisch einen vollständig konfigurierten Linux-Desktop-Server auf Hetzner Cloud:
- Kind loggt sich per **RDP** ein und arbeitet
- Levin kann sich per **VNC** auf die Session des Kindes schalten um zu helfen

### Benutzer-Accounts

| User | Passwort | Zugang | Beschreibung |
|------|----------|--------|--------------|
| `${ADMIN_NAME}` | auto-generiert | SSH, RDP | Admin/Sudoer (konfigurierbar in .env) |
| `<kindname>` | auto-generiert | RDP | Wird aus Hostname extrahiert |

### Zugriffsmethoden

- **Kind (RDP):** `<server-ip>:3389` mit eigenem Account (Passwort wird bei Deploy generiert)
- **Mentor (VNC):** `vnc://<server-ip>:5900` - Screen Sharing (startet wenn Kind eingeloggt ist, Passwort wird bei Deploy generiert)
- **Admin (SSH):** `ssh <admin>@<server-ip>` (Name konfigurierbar via ADMIN_NAME in .env)

## Hetzner Cloud Konfiguration

- **Server Type:** cx33 (4 vCPU, 8 GB RAM, 80 GB Disk)
- **Image:** Debian 12
- **Location:** nbg1 (Nürnberg)
- **SSH Keys:** Konfigurierbar in `.env` (SSH_AUTHORIZED_KEYS)
- **API Token:** In `.env` Datei (gitignored)

## Installierte Software

- **Debian 12** (kein Snap-Bloatware!)
- **XFCE Desktop** (leichtgewichtig, optimiert für RDP)
- **VS Code** (.deb)
- **Firefox ESR** (.deb - schneller als Snap!)
- xRDP, x11vnc
- Git, Python3, build-essential
- Thunar, Mousepad, XFCE Terminal

## Performance-Optimierungen

- XFCE Compositor deaktiviert (keine Schatten/Transparenz)
- xrdp: 16-bit Farben, low encryption
- 2GB Swap
- VS Code als .deb statt Snap

## Deployment

```bash
# Setup
cp .env.example .env
# .env ausfüllen mit:
# - HETZNER_API_TOKEN
# - ADMIN_NAME
# - SSH_AUTHORIZED_KEYS (deine Public Keys)
# - HETZNER_SSH_KEY_ID (optional)
npm install

# Server erstellen (generiert automatisch Passwörter)
npm run deploy create --name <kindname>

# Server anzeigen
npm run deploy list

# Server löschen
npm run deploy delete --name <kindname>
```

Das Script generiert bei jedem Deploy neue, sichere Passwörter und zeigt sie auf der Konsole an.

## Konfiguration (.env)

Alle sensiblen Daten werden in `.env` konfiguriert (gitignored):
- `HETZNER_API_TOKEN` - Hetzner Cloud API Token
- `ADMIN_NAME` - Name des Admin-Accounts
- `SSH_AUTHORIZED_KEYS` - SSH Public Keys (einer pro Zeile)
- `HETZNER_SSH_KEY_ID` - (optional) Hetzner SSH Key ID für Rescue-System

## Hinweise

- Hostname `coding-class-<name>` → User `<name>` wird erstellt
- Installation dauert ~10 Minuten, Server rebootet am Ende
- Desktop-Icons werden beim ersten Login als "trusted" markiert
