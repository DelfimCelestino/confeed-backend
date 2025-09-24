// src/middlewares/authMiddleware.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../config/db";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
    };
  }
}

export const authenticate = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      console.log("[AUTHMIDDLEWARE] Token de autenticação não fornecido");
      return reply.status(401).send({
        message: "Token de autenticação não fornecido",
      });
    }

    try {
      const decoded = verifyToken(token) as { userId: string };
      
      // Verificar se o usuário existe no banco
      const user = await (prisma as any).user.findUnique({
        where: { id: decoded.userId },
        select: { id: true }
      });

      if (!user) {
        console.log("[AUTHMIDDLEWARE] Usuário não encontrado no banco de dados");
        return reply.status(401).send({
          message: "user_not_found",
          code: "USER_NOT_FOUND"
        });
      }

      req.user = { id: decoded.userId };
    } catch (error: any) {
      console.log("[AUTHMIDDLEWARE] Erro ao verificar token:", error.message);
      return reply.status(401).send({
        message: "Token de autenticação inválido",
        code: "INVALID_TOKEN"
      });
    }
  } catch (error) {
    console.log("[AUTHMIDDLEWARE] Erro na autenticação", error);
    return reply.status(401).send({
      message: "Erro na autenticação",
    });
  }
};

