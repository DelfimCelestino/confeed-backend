import { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/authMiddleware";
import * as AuthController from "../controllers/authController";
import * as ConfessionController from "../controllers/confessionController";
import * as CommunityController from "../controllers/communityController";
import * as SearchController from "../controllers/searchController";
import * as NotificationsController from "../controllers/notificationsController";
import * as ChatController from "../controllers/chatController";
import { prisma } from "../config/db";


// Agrupa todas as rotas em um objeto
const routes = {
  // Rotas de autenticação
  auth: async (fastify: FastifyInstance) => {
    fastify.post("/login", AuthController.checkuser);
    fastify.get("/me", { preHandler: authenticate }, AuthController.me);
  },

  // Rotas de confessions
  confessions: async (fastify: FastifyInstance) => {
    fastify.post("/", { preHandler: authenticate }, ConfessionController.createConfession);
    fastify.get("/",{ preHandler: authenticate }, ConfessionController.getConfessions);
    fastify.get("/:slug",{ preHandler: authenticate }, ConfessionController.getConfessionBySlug);
    fastify.post("/:id/upvote", { preHandler: authenticate }, ConfessionController.upvoteConfession);
  },

  // Rotas de comentários
  comments: async (fastify: FastifyInstance) => {
    fastify.post("/", { preHandler: authenticate }, ConfessionController.createComment);
    fastify.get("/", ConfessionController.getComments);
    fastify.post("/:id/upvote", { preHandler: authenticate }, ConfessionController.upvoteComment);
    fastify.put("/:id", { preHandler: authenticate }, ConfessionController.updateComment);
  },

  // Rotas de comunidades
  communities: async (fastify: FastifyInstance) => {
    fastify.post("/", { preHandler: authenticate }, CommunityController.createCommunity);
    fastify.get("/", CommunityController.getCommunities);
    fastify.get("/:slug", CommunityController.getCommunityBySlug);
  },

  search: async (fastify: FastifyInstance) => {
    fastify.get("/", SearchController.search);
  },

  notifications: async (fastify: FastifyInstance) => {
    fastify.get("/", { preHandler: authenticate }, NotificationsController.list);
    fastify.get("/unread", { preHandler: authenticate }, NotificationsController.unreadCount);
    fastify.post("/mark-all", { preHandler: authenticate }, NotificationsController.markAllRead);
    fastify.post("/:id/mark", { preHandler: authenticate }, NotificationsController.markRead);
  },

  chat: async (fastify: FastifyInstance) => {
    fastify.get("/history", { preHandler: authenticate }, ChatController.getChatHistory);
  },

  // Registra health check
  health: async (fastify: FastifyInstance) => {
    fastify.get("/", async (req, res) => {
      const startTime = Date.now();
      
      try {
        // Testar conexão com banco de dados
        await prisma.$queryRaw`SELECT 1`;
        const dbResponseTime = Date.now() - startTime;
        
        // Informações do processo Node.js
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();
        
        // Informações do sistema
        const cpuUsage = process.cpuUsage();
        
        res.send({
          status: "healthy",
          timestamp: new Date().toISOString(),
          uptime: {
            seconds: Math.floor(uptime),
            formatted: formatUptime(uptime),
          },
          database: {
            status: "connected",
            responseTime: `${dbResponseTime}ms`,
          },
          memory: {
            rss: formatBytes(memoryUsage.rss),
            heapTotal: formatBytes(memoryUsage.heapTotal),
            heapUsed: formatBytes(memoryUsage.heapUsed),
            external: formatBytes(memoryUsage.external),
            usagePercentage: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2) + '%',
          },
          cpu: {
            user: `${(cpuUsage.user / 1000000).toFixed(2)}s`,
            system: `${(cpuUsage.system / 1000000).toFixed(2)}s`,
          },
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          platform: process.platform,
          app: {
            name: "Confeed API",
            version: "1.0.0",
            minimumClientVersion: "1.0.0",
            forceUpdate: false,
          },
        });
      } catch (error) {
        res.status(503).send({
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          error: "Database connection failed",
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  },
};

// Funções auxiliares
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

// Função para registrar todas as rotas
export const registerRoutes = async (fastify: FastifyInstance) => {
  // Registra todas as rotas com o prefixo /api
  fastify.register(
    async (fastify) => {
      // Registra as rotas de autenticação
      fastify.register(routes.auth, { prefix: "/auth" });

      // Registra as rotas de confessions
      fastify.register(routes.confessions, { prefix: "/confessions" });

      // Registra as rotas de comentários
      fastify.register(routes.comments, { prefix: "/comments" });

      // Registra as rotas de comunidades
      fastify.register(routes.communities, { prefix: "/communities" });

      // Registra a rota de busca
      fastify.register(routes.search, { prefix: "/search" });

      // Registra notificações
      fastify.register(routes.notifications, { prefix: "/notifications" });

      // Registra chat
      fastify.register(routes.chat, { prefix: "/chat" });

      // Registra health check
      fastify.register(routes.health, { prefix: "/health" });

      // ... registro de outras rotas
    },
    { prefix: "/api" }
  );
};

export default routes;
