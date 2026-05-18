import type Database from "better-sqlite3";
import type { PersistedMessage } from "../ws/protocol";

export class ChatDb {
  constructor(private db: Database.Database) {}

  migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        session_key TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        msg_type TEXT NOT NULL DEFAULT 'text',
        card_data TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_chat_agent_session
        ON chat_messages(agent_id, session_key, id DESC);
    `);
  }

  insert(agentId: string, sessionKey: string, role: string, content: string, msgType: string, cardData?: string): number {
    const stmt = this.db.prepare(
      `INSERT INTO chat_messages (agent_id, session_key, role, content, msg_type, card_data) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(agentId, sessionKey, role, content, msgType, cardData ?? null);
    return result.lastInsertRowid as number;
  }

  getRecent(agentId: string, sessionKey: string, limit: number): PersistedMessage[] {
    const rows = this.db.prepare(
      `SELECT id, role, content, msg_type, card_data, created_at as timestamp
       FROM chat_messages
       WHERE agent_id = ? AND session_key = ?
       ORDER BY id DESC LIMIT ?`
    ).all(agentId, sessionKey, limit) as PersistedMessage[];
    return rows.reverse();
  }

  getBefore(agentId: string, sessionKey: string, beforeId: number, limit: number): { messages: PersistedMessage[]; hasMore: boolean } {
    const rows = this.db.prepare(
      `SELECT id, role, content, msg_type, card_data, created_at as timestamp
       FROM chat_messages
       WHERE agent_id = ? AND session_key = ? AND id < ?
       ORDER BY id DESC LIMIT ?`
    ).all(agentId, sessionKey, beforeId, limit + 1) as PersistedMessage[];

    const hasMore = rows.length > limit;
    const messages = rows.slice(0, limit).reverse();
    return { messages, hasMore };
  }

  getLastMessages(agentId: string, sessionKey: string, count: number): Array<{ role: string; timestamp?: string }> {
    return this.db.prepare(
      `SELECT role, created_at as timestamp
       FROM chat_messages
       WHERE agent_id = ? AND session_key = ?
       ORDER BY id DESC LIMIT ?`
    ).all(agentId, sessionKey, count) as Array<{ role: string; timestamp: string }>;
  }
}
