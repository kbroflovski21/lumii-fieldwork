import { prisma } from "./prisma";
import type { PersistedMessage } from "../ws/protocol";

export class ChatDb {
  constructor() {}

  async migrate(): Promise<void> {
    // No-op: Prisma Migrate handles schema
  }

  async insert(agentId: string, sessionKey: string, role: string, content: string, msgType: string, cardData?: string): Promise<number> {
    const msg = await prisma.chatMessage.create({
      data: {
        agentId,
        sessionKey,
        role: role as any,
        content,
        msgType,
        cardData: cardData ?? null,
      },
    });
    return msg.id;
  }

  async getRecent(agentId: string, sessionKey: string, limit: number): Promise<PersistedMessage[]> {
    const rows = await prisma.chatMessage.findMany({
      where: { agentId, sessionKey },
      orderBy: { id: "desc" },
      take: limit,
      select: { id: true, role: true, content: true, msgType: true, cardData: true, createdAt: true },
    });
    return rows.reverse().map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      msg_type: r.msgType,
      card_data: r.cardData,
      timestamp: r.createdAt.toISOString(),
    }));
  }

  async getBefore(agentId: string, sessionKey: string, beforeId: number, limit: number): Promise<{ messages: PersistedMessage[]; hasMore: boolean }> {
    const rows = await prisma.chatMessage.findMany({
      where: { agentId, sessionKey, id: { lt: beforeId } },
      orderBy: { id: "desc" },
      take: limit + 1,
      select: { id: true, role: true, content: true, msgType: true, cardData: true, createdAt: true },
    });
    const hasMore = rows.length > limit;
    const messages = rows.slice(0, limit).reverse().map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      msg_type: r.msgType,
      card_data: r.cardData,
      timestamp: r.createdAt.toISOString(),
    }));
    return { messages, hasMore };
  }

  async getLastMessages(agentId: string, sessionKey: string, count: number): Promise<Array<{ role: string; timestamp?: string }>> {
    const rows = await prisma.chatMessage.findMany({
      where: { agentId, sessionKey },
      orderBy: { id: "desc" },
      take: count,
      select: { role: true, createdAt: true },
    });
    return rows.map((r) => ({
      role: r.role,
      timestamp: r.createdAt.toISOString(),
    }));
  }
}
