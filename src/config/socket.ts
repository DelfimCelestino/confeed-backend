import { Server } from "socket.io";
import { FastifyInstance } from "fastify";
import { Server as HTTPServer } from "http";
import { verifyId, verifyToken } from "../utils/jwt";

interface SocketUser {
  userId: string;
  socketId: string;
}

// Armazenamento de usuários conectados
const connectedUsers: Map<string, SocketUser> = new Map();

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

    // Evento de desconexão
    socket.on("disconnect", () => {
      console.log(`🚪 Usuário ${socket.id} desconectado`);
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
