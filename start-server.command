#!/bin/bash
# Double-click this file to start the International RE server
cd "$(dirname "$0")"
echo "------------------------------------"
echo "  International RE — Starting up..."
echo "  Subscribers → newsletter_subscribers.xlsx"
echo "  Website    → http://localhost:3000"
echo "------------------------------------"
node server.js
