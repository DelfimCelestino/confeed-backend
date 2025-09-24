import { Server } from "socket.io";
import { FastifyInstance } from "fastify";
interface SocketUser {
    userId: string;
    socketId: string;
}
export declare const initialize: (fastify: FastifyInstance) => Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const getIO: () => Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const getConnectedUsers: () => SocketUser[];
export declare const isUserConnected: (userId: string) => boolean;
export declare const getUserSocketId: (userId: string) => string | undefined;
export declare const sendPrivateMessage: (to: string, message: any) => void;
export declare const sendGroupMessage: (groupId: string, message: any) => void;
export declare const sendNotification: (to: string, notification: any) => void;
export declare const broadcastToRoom: (roomId: string, event: string, data: any) => void;
export {};
