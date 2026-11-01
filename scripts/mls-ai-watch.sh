#!/bin/bash
# My Little Shadow AI watcher (Mac mini, LaunchAgent com.minibrew.mls-ai-watch, every 10 min). No AI.
# The site pauses sales and shows "back soon" when the Anthropic account is out of funds or its key fails
# (GET /api/bridge?status -> {"down": true}). This sends one phone alert per outage and one when it clears.
# Stop switch: chmod -x ~/bin/mls-ai-watch.sh
STATE="$HOME/HomeBrain/state/mls-ai-down"
down=$(curl -s --max-time 20 "https://mylittleshadow.com/api/bridge?status&t=$(date +%s)" | grep -o '"down":true')
if [ -n "$down" ] && [ ! -f "$STATE" ]; then
  date > "$STATE"
  "$HOME/bin/janitor-alert.sh" "My Little Shadow: sales paused" "The AI account is out of funds or its key failed. The site shows 'back soon' and takes no payments. Top up Anthropic, then it clears on its own within 10 minutes."
elif [ -z "$down" ] && [ -f "$STATE" ]; then
  rm -f "$STATE"
  "$HOME/bin/janitor-alert.sh" "My Little Shadow: back to normal" "AI calls are working again and sales have resumed."
fi
