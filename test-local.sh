#!/bin/bash
# =============================================================================
# Lokaler Test für cloud-config.yaml mit Multipass
# =============================================================================
#
# Voraussetzungen:
#   sudo snap install multipass
#
# Verwendung:
#   ./test-local.sh              # Startet Test-VM
#   ./test-local.sh --cleanup    # Löscht Test-VM
#   ./test-local.sh --shell      # Öffnet Shell in Test-VM
#
# =============================================================================

set -e

VM_NAME="friedrich-desktop"
CONFIG_FILE="cloud-config.yaml"

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Cleanup-Funktion
cleanup() {
    log_info "Lösche VM '$VM_NAME'..."
    multipass delete "$VM_NAME" --purge 2>/dev/null || true
    log_info "VM gelöscht"
}

# Shell in VM öffnen
open_shell() {
    if multipass info "$VM_NAME" &>/dev/null; then
        log_info "Öffne Shell in '$VM_NAME'..."
        multipass shell "$VM_NAME"
    else
        log_error "VM '$VM_NAME' existiert nicht. Starte erst mit: $0"
        exit 1
    fi
}

# Haupttest
run_test() {
    # Prüfe ob Multipass installiert ist
    if ! command -v multipass &>/dev/null; then
        log_error "Multipass nicht installiert!"
        echo "Installiere mit: sudo snap install multipass"
        exit 1
    fi

    # Prüfe ob Config existiert
    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Config-Datei '$CONFIG_FILE' nicht gefunden!"
        exit 1
    fi

    # Lösche alte VM falls vorhanden
    if multipass info "$VM_NAME" &>/dev/null; then
        log_warn "VM '$VM_NAME' existiert bereits, lösche..."
        cleanup
    fi

    # YAML Syntax prüfen
    log_info "Prüfe YAML Syntax..."
    python3 -c "import yaml; yaml.safe_load(open('$CONFIG_FILE'))" || {
        log_error "YAML Syntax-Fehler!"
        exit 1
    }
    log_info "YAML Syntax OK"

    # Cloud-init Schema prüfen (falls cloud-init installiert)
    if command -v cloud-init &>/dev/null; then
        log_info "Prüfe cloud-init Schema..."
        cloud-init schema --config-file "$CONFIG_FILE" || {
            log_warn "Schema-Warnung (kann ignoriert werden)"
        }
    fi

    # VM starten
    log_info "Starte VM '$VM_NAME' mit cloud-config..."
    log_info "Das dauert ca. 5-10 Minuten..."

    multipass launch 24.04 \
        --name "$VM_NAME" \
        --cpus 2 \
        --memory 4G \
        --disk 20G \
        --cloud-init "$CONFIG_FILE" \
        --timeout 600

    log_info "VM gestartet, warte auf cloud-init..."

    # Warte auf cloud-init
    for i in {1..60}; do
        STATUS=$(multipass exec "$VM_NAME" -- cloud-init status 2>/dev/null || echo "running")
        echo -ne "\r[${i}/60] Status: $STATUS                    "

        if echo "$STATUS" | grep -q "done"; then
            echo ""
            log_info "Cloud-init abgeschlossen!"
            break
        fi

        if echo "$STATUS" | grep -q "error"; then
            echo ""
            log_error "Cloud-init Fehler!"
            multipass exec "$VM_NAME" -- cat /var/log/cloud-init-output.log
            exit 1
        fi

        sleep 10
    done

    echo ""
    echo "========================================"
    echo "           TESTS"
    echo "========================================"

    # Tests durchführen
    run_checks() {
        local test_name="$1"
        local test_cmd="$2"

        if multipass exec "$VM_NAME" -- bash -c "$test_cmd" &>/dev/null; then
            echo -e "${GREEN}✓${NC} $test_name"
            return 0
        else
            echo -e "${RED}✗${NC} $test_name"
            return 1
        fi
    }

    FAILED=0

    run_checks "Admin-User 'levin' existiert" "id levin" || FAILED=1
    run_checks "Kind-User 'friedrich' existiert" "id friedrich" || FAILED=1
    run_checks "Home-Verzeichnis existiert" "test -d /home/friedrich" || FAILED=1
    run_checks "Desktop-Verzeichnis existiert" "test -d /home/friedrich/Desktop" || FAILED=1
    run_checks "Projekte-Verzeichnis existiert" "test -d /home/friedrich/Projekte" || FAILED=1
    run_checks "Config-Datei erstellt" "test -f /etc/coding-class.conf" || FAILED=1
    run_checks "xrdp installiert" "dpkg -l | grep -q xrdp" || FAILED=1
    run_checks "x11vnc installiert" "dpkg -l | grep -q x11vnc" || FAILED=1
    run_checks "GDM3 konfiguriert" "grep -q WaylandEnable=false /etc/gdm3/custom.conf" || FAILED=1
    run_checks "Auto-Login konfiguriert" "grep -q AutomaticLogin=friedrich /etc/gdm3/custom.conf" || FAILED=1
    run_checks "Polkit-Regeln existieren" "test -f /etc/polkit-1/rules.d/45-allow-colord.rules" || FAILED=1
    run_checks "xrdp Service aktiviert" "systemctl is-enabled xrdp" || FAILED=1
    run_checks "x11vnc Service aktiviert" "systemctl is-enabled x11vnc" || FAILED=1

    echo "========================================"

    if [ $FAILED -eq 0 ]; then
        log_info "Alle Tests bestanden!"
    else
        log_error "Einige Tests fehlgeschlagen!"
    fi

    echo ""
    log_info "VM läuft noch. Optionen:"
    echo "  - Shell öffnen:  $0 --shell"
    echo "  - VM löschen:    $0 --cleanup"
    echo "  - IP-Adresse:    $(multipass info $VM_NAME | grep IPv4 | awk '{print $2}')"

    return $FAILED
}

# Argumente verarbeiten
case "${1:-}" in
    --cleanup|-c)
        cleanup
        ;;
    --shell|-s)
        open_shell
        ;;
    --help|-h)
        echo "Verwendung: $0 [OPTION]"
        echo ""
        echo "Optionen:"
        echo "  (keine)      Startet Test-VM mit cloud-config"
        echo "  --shell, -s  Öffnet Shell in Test-VM"
        echo "  --cleanup, -c  Löscht Test-VM"
        echo "  --help, -h   Zeigt diese Hilfe"
        ;;
    *)
        run_test
        ;;
esac
