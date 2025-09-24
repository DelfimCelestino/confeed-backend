import { FastifyRequest, FastifyReply } from "fastify";
interface SearchUsersQuery {
    query: string;
}
export declare function searchUsers(request: FastifyRequest<{
    Querystring: SearchUsersQuery;
}>, reply: FastifyReply): Promise<never>;
export {};
