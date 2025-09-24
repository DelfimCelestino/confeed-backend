import { FastifyRequest, FastifyReply } from "fastify";
export declare const createActivity: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const getPublicActivities: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const getMyActivities: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const getJoinedActivities: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const getActivityStats: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const getActivityChat: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const contributeToActivity: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const getActivityContributions: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const getRooms: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const getActivityById: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const updateActivity: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
interface InviteUserParams {
    activityId: string;
    userId: string;
}
export declare function inviteUser(request: FastifyRequest<{
    Params: InviteUserParams;
}>, reply: FastifyReply): Promise<never>;
export declare const registerMoment: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const getFeed: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const toggleActivityLike: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const createComment: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const updateComment: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const deleteComment: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const getComments: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const deleteActivity: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export {};
