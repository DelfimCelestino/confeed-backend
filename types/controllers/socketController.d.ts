import { Socket } from "socket.io";
export declare const handleGroupMessage: (socket: Socket, { groupId, message }: {
    groupId: string;
    message: string;
}) => Promise<void>;
