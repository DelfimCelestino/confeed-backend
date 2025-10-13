import { Server } from "socket.io";
import { FastifyInstance } from "fastify";
import { Server as HTTPServer } from "http";
import { verifyId, verifyToken } from "../utils/jwt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SocketUser {
  userId: string;
  socketId: string;
}

// Armazenamento de usuários conectados
const connectedUsers: Map<string, SocketUser> = new Map();

// Estados em memória para o chat global (MVP sem persistência)
const usersInGlobalChat: Set<string> = new Set();
const unreadByUserId: Map<string, number> = new Map();

// Controle de quem está digitando
const typingUsers: Map<string, { nickname: string; timestamp: number }> = new Map();
const TYPING_TIMEOUT = 3000; // 3 segundos

interface GlobalChatMessage {
  id: string;
  userId: string;
  nickname?: string;
  avatarUrl?: string;
  text: string;
  createdAt: string;
  replyTo?: {
    id: string;
    userId: string;
    nickname?: string;
    text: string;
  };
}

// Instância global do Socket.IO
let io: Server;

export const initialize = (fastify: FastifyInstance) => {
  const httpServer = fastify.server as HTTPServer;
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io",
  });

  // Middleware de autenticação
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        console.log("❌ Token não fornecido");
        return next(new Error("Authentication error"));
      }

      const decoded = verifyToken(token) as { userId: string };

      console.log("ID decoded:" + decoded);
      if (!decoded || !decoded.userId) {
        console.log("❌ Token inválido ou sem userId");
        return next(new Error("Authentication error"));
      }

      const user = await verifyId(decoded.userId);
      if (!user) {
        console.log(`❌ Usuário ${decoded.userId} não encontrado`);
        return next(new Error("Authentication error"));
      }

      console.log(`✅ Usuário ${user.id} autenticado com sucesso`);

      // Definir o userId no socket.data
      socket.data = {
        ...socket.data,
        userId: user.id,
        nickname: (user as any).nickname,
        avatarUrl: (user as any).avatarUrl,
      };
      console.log("Dados de auth: " + JSON.stringify(socket.data));

      // Adicionar o usuário à lista de conectados
      connectedUsers.set(user.id, {
        userId: user.id,
        socketId: socket.id,
      });

      next();
    } catch (error) {
      console.error("❌ Erro na autenticação do socket:", error);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🚪 Usuário ${socket.id} conectado`);

    const userId: string | undefined = socket.data?.userId;
    const nickname: string | undefined = socket.data?.nickname;

    // Entra na sala global por padrão
    socket.join("global");

    // Atualiza e emite presença (contagem + lista simples)
    const emitPresence = () => {
      const list = Array.from(connectedUsers.values()).map(({ userId, socketId }) => {
        const s = io.sockets.sockets.get(socketId);
        return {
          userId,
          nickname: (s?.data?.nickname as string | undefined) || undefined,
          avatarUrl: (s?.data?.avatarUrl as string | undefined) || undefined,
        };
      });
      io.emit("presence:count", { count: connectedUsers.size });
      io.emit("presence:list", { users: list });
    };
    emitPresence();

    // Permite o cliente solicitar a contagem atual
    socket.on("presence:get", () => {
      const list = Array.from(connectedUsers.values()).map(({ userId, socketId }) => {
        const s = io.sockets.sockets.get(socketId);
        return {
          userId,
          nickname: (s?.data?.nickname as string | undefined) || undefined,
          avatarUrl: (s?.data?.avatarUrl as string | undefined) || undefined,
        };
      });
      socket.emit("presence:count", { count: connectedUsers.size });
      socket.emit("presence:list", { users: list });
    });

    // Usuário abriu a tela do chat global
    socket.on("chat:join", () => {
      if (userId) {
        usersInGlobalChat.add(userId);
        unreadByUserId.set(userId, 0);
        socket.emit("chat:unread", { count: 0 });
      }
    });

    // Usuário saiu/fechou a tela do chat global
    socket.on("chat:leave", () => {
      if (userId) {
        usersInGlobalChat.delete(userId);
      }
    });

    // Marcar como lido manualmente
    socket.on("chat:mark_read", () => {
      if (userId) {
        unreadByUserId.set(userId, 0);
        socket.emit("chat:unread", { count: 0 });
      }
    });

    // Envio de mensagem para sala global com detecção de menções
    socket.on("chat:send", async (payload: { text: string; replyToId?: string }) => {
      if (!payload || typeof payload.text !== "string") return;
      if (!userId) return;

      try {
        // Persistir mensagem no banco de dados
        const savedMessage = await (prisma as any).chatMessage.create({
          data: {
            userId,
            text: payload.text,
            replyToId: payload.replyToId || null,
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
                user: { select: { id: true, nickname: true } },
              },
            },
          },
        });

        const message: GlobalChatMessage = {
          id: savedMessage.id,
          userId: savedMessage.userId,
          nickname: savedMessage.user?.nickname,
          avatarUrl: savedMessage.user?.avatarUrl ?? undefined,
          text: savedMessage.text,
          createdAt: savedMessage.createdAt.toISOString(),
          replyTo: savedMessage.replyTo
            ? {
                id: savedMessage.replyTo.id,
                userId: savedMessage.replyTo.userId,
                nickname: savedMessage.replyTo.user?.nickname,
                text: savedMessage.replyTo.text,
              }
            : undefined,
        };

        // Broadcast para sala global
        io.to("global").emit("chat:message", message);

        // Detecção de menções por @nickname ou @nickname#123
        const mentionMatches = payload.text.match(/@([a-zA-Z0-9_\.\-#]+)/g) || [];
        const normalize = (s: string) => s
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        
        const mentionedNicknames = new Set(
          mentionMatches
            .map((m) => m.slice(1))
            .map((h) => h.split('#')[0]) // usa apenas a parte antes do '#'
            .map((n) => normalize(n))
        );

        if (mentionedNicknames.size > 0) {
          for (const [uid, { socketId }] of connectedUsers.entries()) {
            const target = io.sockets.sockets.get(socketId);
            const targetNick = normalize(target?.data?.nickname || "");
            if (target && targetNick && mentionedNicknames.has(targetNick)) {
              target.emit("chat:mention", {
                messageId: message.id,
                text: message.text,
              });
            }
          }
        }

        // Atualiza não lidas de quem não está com a tela aberta
        for (const [uid, { socketId }] of connectedUsers.entries()) {
          if (uid === userId) continue;
          if (usersInGlobalChat.has(uid)) continue;

          const current = unreadByUserId.get(uid) || 0;
          const next = current + 1;
          unreadByUserId.set(uid, next);
          io.to(socketId).emit("chat:unread", { count: next });
        }
      } catch (error) {
        console.error("Erro ao salvar mensagem:", error);
        socket.emit("chat:error", { message: "Erro ao enviar mensagem" });
      }
    });

    // Edição de mensagem
    socket.on("chat:edit", async (payload: { id: string; text: string }) => {
      try {
        if (!payload?.id || typeof payload.text !== "string") return;
        // Apenas o autor pode editar
        const existing = await (prisma as any).chatMessage.findUnique({ where: { id: payload.id } });
        if (!existing || existing.userId !== userId) return;

        const updated = await (prisma as any).chatMessage.update({
          where: { id: payload.id },
          data: { text: payload.text, editedAt: new Date() },
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } },
            replyTo: { include: { user: { select: { id: true, nickname: true } } } },
          },
        });

        const message: GlobalChatMessage = {
          id: updated.id,
          userId: updated.userId,
          nickname: updated.user?.nickname,
          avatarUrl: updated.user?.avatarUrl ?? undefined,
          text: updated.text,
          createdAt: updated.createdAt.toISOString(),
          replyTo: updated.replyTo
            ? {
                id: updated.replyTo.id,
                userId: updated.replyTo.userId,
                nickname: updated.replyTo.user?.nickname,
                text: updated.replyTo.text,
              }
            : undefined,
        };

        io.to("global").emit("chat:message_edit", { ...message, editedAt: updated.editedAt?.toISOString() });
      } catch (e) {
        console.error("Erro ao editar mensagem:", e);
      }
    });

    // Indicador de digitação
    socket.on("chat:typing", () => {
      if (!userId || !nickname) return;
      
      // Adiciona o usuário à lista de digitando
      typingUsers.set(userId, { nickname, timestamp: Date.now() });
      
      // Emite a lista atualizada de quem está digitando
      emitTypingStatus();
    });

    socket.on("chat:stop_typing", () => {
      if (!userId) return;
      
      // Remove o usuário da lista de digitando
      typingUsers.delete(userId);
      
      // Emite a lista atualizada
      emitTypingStatus();
    });

    // Função auxiliar para emitir status de digitação
    const emitTypingStatus = () => {
      const now = Date.now();
      const activeTypers: string[] = [];
      
      // Remove usuários que pararam de digitar (timeout)
      for (const [uid, data] of typingUsers.entries()) {
        if (now - data.timestamp > TYPING_TIMEOUT) {
          typingUsers.delete(uid);
        } else {
          activeTypers.push(data.nickname);
        }
      }
      
      // Emite para todos na sala global
      io.to("global").emit("chat:typing_status", { 
        typingUsers: activeTypers,
        count: activeTypers.length 
      });
    };

    // Evento de desconexão
    socket.on("disconnect", () => {
      console.log(`🚪 Usuário ${socket.id} desconectado`);
      if (userId) {
        usersInGlobalChat.delete(userId);
        connectedUsers.delete(userId);
        typingUsers.delete(userId);
        emitPresence();
        emitTypingStatus();
      }
    });
  });

  return io;
};

// Exporta a instância do Socket.IO
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO não foi inicializado");
  }
  return io;
};
