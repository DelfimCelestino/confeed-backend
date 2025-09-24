import { FastifyRequest, FastifyReply } from "fastify";
export declare const getWallet: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare const getWalletTransactions: (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
export declare function withdraw(request: FastifyRequest, reply: FastifyReply): Promise<{
    success: boolean;
    transaction: {
        wallet: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            balance: number;
        };
        notification: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            activityId: string | null;
            content: string;
            type: import(".prisma/client").$Enums.NotificationType;
            fromUserId: string | null;
            toUserId: string;
            read: boolean;
        };
    };
}>;
