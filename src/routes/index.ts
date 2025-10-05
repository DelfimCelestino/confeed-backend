import { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/authMiddleware";
import * as AuthController from "../controllers/authController";
import * as ConfessionController from "../controllers/confessionController";
import * as CommunityController from "../controllers/communityController";
import * as SearchController from "../controllers/searchController";
import * as NotificationsController from "../controllers/notificationsController";
import * as ChatController from "../controllers/chatController";


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
   

      res.send({
        status: "ok",
        date: new Date(),
        systemInfo:{
          currentVersion: "1.0.0",
          minimumVersion: "1.0.0",
          forceUpdate: false,
          updateMessage: "Nova versão disponível",
        },
      });
    });
  },
};

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
