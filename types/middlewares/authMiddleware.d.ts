import { FastifyRequest, FastifyReply } from "fastify";
declare module "fastify" {
    interface FastifyRequest {
        user?: {
            id: string;
        };
    }
}
export declare const authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<undefined>;
