import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DEMO_INPUTS } from './demo-fixtures.js';

export const ORG = 'local-development';
import { validateMatter, AppError, limits } from './validation.js';
export { validateMatter, AppError } from './validation.js';

export function openStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(readFileSync(new URL('../db/001-foundation.sql', import.meta.url), 'utf8'));
  db.prepare('INSERT OR IGNORE INTO organizations (id,name) VALUES (?,?)').run(ORG, 'Development workspace');
  const get = id => db.prepare('SELECT * FROM matters WHERE id=? AND organization_id=?').get(id, ORG);
  const audit = (id, action, version, now) => db.prepare('INSERT INTO audit_events VALUES (?,?,?,?,?,?,?)').run(randomUUID(), ORG, id, action, 'Local developer (unauthenticated)', version, now);
  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); db.exec('COMMIT'); return value; }
    catch (error) { db.exec('ROLLBACK'); if (String(error.message).includes('UNIQUE constraint failed')) throw new AppError(409, 'This claim number already exists.'); throw error; }
  }
  function create(input, demo = false) {
    const m = validateMatter(input), id = randomUUID(), now = new Date().toISOString();
    return transaction(() => {
      db.prepare('INSERT INTO matters (id,organization_id,claim_number,title,insured,claimant,jurisdiction,analyst,reviewer,recipient,incident_date,notes,status,is_demo,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id, ORG, ...Object.keys(limits).map(k => m[k]), m.status, demo ? 1 : 0, now, now);
      audit(id, 'Matter created', 1, now); return get(id);
    });
  }
  return {
    list() { return db.prepare('SELECT * FROM matters WHERE organization_id=? ORDER BY updated_at DESC,id').all(ORG); },
    get(id) { const matter = get(id); if (!matter) throw new AppError(404, 'Matter not found.'); return matter; },
    create,
    update(id, input) {
      if (!Number.isInteger(input?.version)) throw new AppError(400, 'The saved version is required.');
      return transaction(() => {
        const current = get(id); if (!current) throw new AppError(404, 'Matter not found.');
        if (current.version !== input.version) throw new AppError(409, 'This matter changed in another window. Close the form and reload before editing.');
        const m = validateMatter(input), now = new Date().toISOString();
        db.prepare(`UPDATE matters SET ${Object.keys(limits).map(k=>`${k}=?`).join(',')},status=?,version=version+1,updated_at=? WHERE id=? AND organization_id=?`).run(...Object.keys(limits).map(k=>m[k]), m.status, now, id, ORG);
        audit(id, 'Matter updated', current.version + 1, now); return get(id);
      });
    },
    events(id) { this.get(id); return db.prepare('SELECT action,actor,version,created_at FROM audit_events WHERE matter_id=? AND organization_id=? ORDER BY created_at DESC,rowid DESC').all(id, ORG); },
    seed() {
      if (this.list().length) throw new AppError(409, 'Demo matters can only be added to an empty workspace.');
      return DEMO_INPUTS.map(f=>create(f,true));
    },
    close() { db.close(); }
  };
}
