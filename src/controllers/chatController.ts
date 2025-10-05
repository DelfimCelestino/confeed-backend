import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ChatHistoryRequest extends FastifyRequest {
  query: {
    limit?: string;
    offset?: string;
  };
}

export const getChatHistory = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const limit = Math.min(parseInt((request.query as any).limit || "100"), 100);
    const offset = parseInt((request.query as any).offset || "0");

    const messages = await (prisma as any).chatMessage.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        replyTo: {
          include: {
            user: {
              select: { id: true, nickname: true },
            },
          },
        },
      },
    });

    // Transformar para o formato esperado pelo frontend
    const formattedMessages = (messages as any[]).reverse().map((msg: any) => ({
      id: msg.id,
      userId: msg.userId,
      nickname: msg.user?.nickname,
      avatarUrl: msg.user?.avatarUrl,
      text: msg.text,
      createdAt: msg.createdAt.toISOString(),
      editedAt: msg.editedAt ? msg.editedAt.toISOString() : undefined,
      replyTo: msg.replyTo
        ? {
            id: msg.replyTo.id,
            userId: msg.replyTo.userId,
            nickname: msg.replyTo.user?.nickname,
            text: msg.replyTo.text,
          }
        : undefined,
    }));

    return reply.send({
      messages: formattedMessages,
      hasMore: messages.length === limit,
    });
  } catch (error) {
    console.error("Erro ao buscar histórico do chat:", error);
    return reply.status(500).send({ error: "Erro interno do servidor" });
  }
};
