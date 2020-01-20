#!/usr/bin/env node

'use strict';

const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');

const key_path = path.join(__dirname, 'keys.json');

if (!fs.existsSync(key_path)) {
  console.error(`Please create keys.json at ${key_path}`);
  process.exit(1);
}

(async function() {
  const keys = await fs.readJson(key_path);

  const refresh_token = async () => {
    const url = `https://api.ecobee.com/token?code=${keys.refresh}&client_id=${keys.api}&grant_type=refresh_token`;
    return await fetch(url, { method: 'post' })
      .then(r => r.json())
      .then(j => ({
        access: j.access_token,
        refresh: j.refresh_token
      }));
  };

  const { access, refresh } = await refresh_token();
  keys.access = access;
  keys.refresh = refresh;
  // Update keys with new tokens
  await fs.writeJson(key_path, keys, { spaces: 2, EOL: '\n' });

  const req = {
    selection: {
      selectionType: 'registered',
      selectionMatch: '',
      includeRuntime: true,
      includeSettings: true
    }
  };
  const headers = {
    headers: {
      Authorization: `Bearer ${access}`
    }
  };
  const url = `https://api.ecobee.com/1/thermostat?format=json&body=${JSON.stringify(req)}`;
  fetch(url, headers)
    .then(r => r.json())
    .then(t => {
      console.log('Current temp:', (t.thermostatList[0].runtime.rawTemperature / 10).toFixed(1));
    })
    .catch(e => console.error(e));
})();

