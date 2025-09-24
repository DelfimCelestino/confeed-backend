import { FastifyRequest, FastifyReply } from "fastify";
interface GetNotificationsQuery {
    page?: string;
    limit?: string;
}
export declare const getNotifications: (req: FastifyRequest<{
    Querystring: GetNotificationsQuery;
}>, reply: FastifyReply) => Promise<never>;
export declare const markAsRead: (req: FastifyRequest<{
    Params: {
        id: string;
    };
}>, reply: FastifyReply) => Promise<never>;
export declare const markAllAsRead: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export {};
