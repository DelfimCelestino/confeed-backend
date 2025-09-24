import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../config/db";

export const list = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return reply.status(401).send({ message: "unauthorized" });

    const { page = "1", limit = "20", filter = "all" } = req.query as { page?: string; limit?: string; filter?: "all" | "unread" };
    const pageNum = parseInt(page || "1");
    const limitNum = Math.min(Math.max(parseInt(limit || "20"), 1), 50);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { recipientId: userId };
    if (filter === "unread") where.isRead = false;

    const [items, total] = await Promise.all([
      (prisma as any).notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        select: {
          id: true, type: true, title: true, description: true, url: true, isRead: true, createdAt: true,
          actor: { select: { id: true, nickname: true, avatarUrl: true } },
        }
      }),
      (prisma as any).notification.count({ where })
    ]);

    return reply.status(200).send({
      notifications: items,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    (req as any).log?.error({ err }, "list notifications error");
    return reply.status(500).send({ message: "internal_error" });
  }
};

export const unreadCount = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return reply.status(401).send({ message: "unauthorized" });
    const count = await (prisma as any).notification.count({ where: { recipientId: userId, isRead: false } });
    return reply.status(200).send({ count });
  } catch (err) {
    (req as any).log?.error({ err }, "unread count error");
    return reply.status(500).send({ message: "internal_error" });
  }
};

export const markRead = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return reply.status(401).send({ message: "unauthorized" });
    const { id } = req.params as { id: string };
    await (prisma as any).notification.updateMany({ where: { id, recipientId: userId }, data: { isRead: true } });
    return reply.status(200).send({ success: true });
  } catch (err) {
    (req as any).log?.error({ err }, "mark read error");
    return reply.status(500).send({ message: "internal_error" });
  }
};

export const markAllRead = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return reply.status(401).send({ message: "unauthorized" });
    await (prisma as any).notification.updateMany({ where: { recipientId: userId, isRead: false }, data: { isRead: true } });
    return reply.status(200).send({ success: true });
  } catch (err) {
    (req as any).log?.error({ err }, "mark all read error");
    return reply.status(500).send({ message: "internal_error" });
  }
};


