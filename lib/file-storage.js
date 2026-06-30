const fs = require('fs');
const path = require('path');

// Local development / test storage backed by JSON files on disk.
function createFileStorage({ dataFile, auditFile }) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.mkdirSync(path.dirname(auditFile), { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '[]', 'utf8');
  }
  if (!fs.existsSync(auditFile)) {
    fs.writeFileSync(auditFile, '[]', 'utf8');
  }

  function readArray(file) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      return [];
    }
  }

  return {
    async readLogs() {
      return readArray(dataFile);
    },
    async writeLogs(logs) {
      fs.writeFileSync(dataFile, JSON.stringify(logs, null, 2));
    },
    async readAudit() {
      return readArray(auditFile);
    },
    async writeAudit(entries) {
      fs.writeFileSync(auditFile, JSON.stringify(entries, null, 2));
    }
  };
}

module.exports = { createFileStorage };
