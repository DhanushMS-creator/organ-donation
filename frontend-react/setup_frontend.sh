#!/bin/bash
cd frontend-react
install_log=/tmp/npm_install_new.log
dev_log=/tmp/npm_dev_new.log
start_log=/tmp/npm_start_new.log

echo "Starting npm install..."
npm install > "$install_log" 2>&1
echo "npm install finished with exit code $?"

echo "Starting npm run dev..."
npm run dev > "$dev_log" 2>&1 &
dev_pid=$!
sleep 15

if grep -Ei "ready|local:|localhost|127.0.0.1|http://|https://|listening on" "$dev_log" >/dev/null 2>&1; then
  echo "Dev server started successfully."
else
  echo "Dev server failed to start or didn't show ready message. Trying npm start..."
  npm start > "$start_log" 2>&1 &
  sleep 15
fi

echo "--- INSTALL LOG ---"
tail -n 20 "$install_log"
echo "--- DEV LOG ---"
tail -n 20 "$dev_log"
echo "--- START LOG ---"
tail -n 20 "$start_log"
