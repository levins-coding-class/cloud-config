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
| levin | levin | SSH, RDP | Admin/Sudoer |
| `<kindname>` | codingclass | RDP | Wird aus Hostname extrahiert |

### Zugriffsmethoden

- **Kind (RDP):** `<server-ip>:3389` mit eigenem Account
- **Levin (VNC):** `vnc://<server-ip>:5900` - Screen Sharing (startet wenn Kind eingeloggt ist), Passwort: `codingclass`
- **Levin (SSH):** `ssh levin@<server-ip>`

## Hetzner Cloud Konfiguration

- **Server Type:** cx33 (4 vCPU, 8 GB RAM, 80 GB Disk)
- **Image:** Debian 12
- **Location:** nbg1 (Nürnberg)
- **SSH Key ID:** 105159908 (claude-debug)
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
# Mit dem Deploy-Script (empfohlen)
npm run deploy

# Oder manuell
source .env
jq -n \
  --arg name "coding-class-<kindname>" \
  --rawfile user_data cloud-config.yaml \
  '{name: $name, server_type: "cx33", image: "debian-12", location: "nbg1", ssh_keys: [105159908], user_data: $user_data}' \
| curl -X POST -H "Authorization: Bearer $HETZNER_API_TOKEN" -H "Content-Type: application/json" -d @- "https://api.hetzner.cloud/v1/servers"

# Server löschen
curl -X DELETE -H "Authorization: Bearer $HETZNER_API_TOKEN" "https://api.hetzner.cloud/v1/servers/<ID>"
```

## SSH Key

- **Pfad:** `~/.ssh/id_ed25519_hetzner`
- **Hetzner ID:** 105159908

## Hinweise

- Hostname `coding-class-<name>` → User `<name>` wird erstellt
- Installation dauert ~10 Minuten, Server rebootet am Ende
- Desktop-Icons werden beim ersten Login als "trusted" markiert
