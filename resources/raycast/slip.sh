#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Print Slip
# @raycast.mode compact
# @raycast.packageName Slipstream

# Optional parameters:
# @raycast.icon 🧾
# @raycast.argument1 { "type": "text", "placeholder": "Todo (!! #tag @today)" }
# @raycast.description Print a todo slip with Slipstream.

for f in "$HOME/.local/bin/slip" "/usr/local/bin/slip" "/Applications/Slipstream.app/Contents/Resources/cli/slip"; do
  if [ -x "$f" ]; then exec "$f" "$1"; fi
done
echo "Install the slip command from Slipstream → Settings → Integrations"
exit 1
