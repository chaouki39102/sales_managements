# =====================================================================
#  share-public-order.config.ps1 - MACHINE-SPECIFIC configuration
#  =====================================================================
#  On a NEW PC (git pull), copy this template to:
#
#        share-public-order.config.ps1
#
#  and fill in the values for THAT machine. The real file is gitignored,
#  so each PC keeps its own private copy - never edit the committed
#  .example file, and never commit the real config (it would overwrite
#  the other PC's settings on pull).
#
#  The scripts (share-public-order.ps1 and server-helper/watchdog.ps1)
#  load this file automatically when it exists. If it is missing, they
#  fall back to the defaults below (standard Tailscale install path).
# =====================================================================

# Path to the Tailscale CLI (Windows default shown).
# To find it on your PC:   (Get-Command tailscale).Source
#   or check:              C:\Program Files\Tailscale\tailscale.exe
$TailscaleCli = 'C:\Program Files\Tailscale\tailscale.exe'

# Local port the Laravel server listens on (must match the port used by
# start-helper.ps1 and the watchdog - normally 8000).
$AppPort = 8000

# YOUR public hostname (informational - used only for reference in the
# setup guide, the scripts auto-detect it from Tailscale).
# Find it by running:   tailscale status
# then use:             https://<your-machine-name>.<your-tailnet>.ts.net
$PublicHostname = 'https://YOUR-MACHINE.your-tailnet.ts.net'
