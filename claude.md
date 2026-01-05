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
| `${ADMIN_NAME}` | auto-generiert | SSH, RDP | Admin/Sudoer (Name konfigurierbar via admin.name in config.json) |
| `<kindname>` | auto-generiert | RDP | Wird aus Hostname extrahiert |

### Zugriffsmethoden

- **Kind (RDP):** `<server-ip>:3389` mit eigenem Account (Passwort wird bei Deploy generiert)
- **Mentor (VNC):** `vnc://<server-ip>:5900` - Screen Sharing (startet wenn Kind eingeloggt ist, Passwort wird bei Deploy generiert)
- **Admin (SSH):** `ssh <admin>@<server-ip>` (Name konfigurierbar via admin.name in config.json)

## Hetzner Cloud Konfiguration

- **Server Type:** cx33 (4 vCPU, 8 GB RAM, 80 GB Disk)
- **Image:** Debian 12
- **Location:** nbg1 (Nürnberg)
- **SSH Keys:** Konfigurierbar in `config.json` (admin.sshKeys)
- **API Token:** In `config.json` (gitignored)

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
cp config.example.json config.json
# config.json ausfüllen
npm install

# Server erstellen (generiert automatisch Passwörter)
npm start create --name <kindname>

# Server anzeigen
npm start list

# Server löschen
npm start delete --name <kindname>
```

Das Script generiert bei jedem Deploy neue, sichere Passwörter und zeigt sie auf der Konsole an.

## Konfiguration (config.json)

Alle sensiblen Daten werden in `config.json` konfiguriert (gitignored):
- `hetzner.apiToken` - Hetzner Cloud API Token
- `admin.name` - Name des Admin-Accounts
- `admin.sshKeys` - SSH Public Keys (als Array)

## Hinweise

- Hostname `coding-class-<name>` → User `<name>` wird erstellt
- Installation dauert ~10 Minuten, Server rebootet am Ende
- Desktop-Icons werden beim ersten Login als "trusted" markiert
