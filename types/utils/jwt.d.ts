import jwt from "jsonwebtoken";
export declare const generateToken: (userId: string) => string;
export declare const verifyToken: (token: string) => string | jwt.JwtPayload;
export declare function verifyId(id: string): Promise<{
    id: string;
    name: string;
    email: string;
    photoURL: string | null;
    pushToken: string | null;
    allowNotifications: boolean;
    lastNotificationAt: Date | null;
    accounType: import(".prisma/client").$Enums.AccounType;
    createdAt: Date;
    updatedAt: Date;
} | null>;
