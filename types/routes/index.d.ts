import { FastifyInstance } from "fastify";
declare const routes: {
    auth: (fastify: FastifyInstance) => Promise<void>;
    profile: (fastify: FastifyInstance) => Promise<void>;
    activities: (fastify: FastifyInstance) => Promise<void>;
    chat: (fastify: FastifyInstance) => Promise<void>;
    wallet: (fastify: FastifyInstance) => Promise<void>;
    users: (fastify: FastifyInstance) => Promise<void>;
    notifications: (fastify: FastifyInstance) => Promise<void>;
    health: (fastify: FastifyInstance) => Promise<void>;
};
export declare const registerRoutes: (fastify: FastifyInstance) => Promise<void>;
export default routes;
