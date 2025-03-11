import EventEmitter from "eventemitter3";
import { Socket } from "./socket"

export interface IServerConfig {
    port: number
    host: string
    timeout?: number
}

export interface IServer extends EventEmitter {
    isDebug: boolean;
    
    start(): void
    
    handlerCallback?: (client: Socket, data: string) => void
    closeHandlerCallback?: (client: Socket) => void

    /**
     * 绑定uid
     * @param uid 
     * @param socket 
     */
    bindUid(uid: number, socket: Socket): void
    /**
     * 解除用户绑定
     * @param uid 
     */
    unbindUid(uid: number): void
    /**
     * 给指定id发送消息
     * @param uid 
     * @param name 
     * @param data 
     */
    sendTo(uid: number, name: string, data: any): void 
    /**
     * 给自定用户发送消息
     * @param uid 
     * @param name 
     * @param data 
     */
    sendToUid(uid: number, name: string, data: any): void

    /**
     * 回复消息
     * @param id 
     * @param requestId 
     * @param data 
     */
    reply(id: number, requestId: number, data: any): void;
}