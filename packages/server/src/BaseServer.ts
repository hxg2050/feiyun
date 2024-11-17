import EventEmitter from "eventemitter3";
import { Socket } from "./socket";

export abstract class BaseServer<T = any> extends EventEmitter {
    sockets = new Map<number, Socket>();
    clients = new Map<number, T>();
    uidSocketIds = new Map<number, number>()

    // handlerCallback?: ((client: Socket, data: string) => void) | undefined;

    bindUid(uid: number, socket: Socket): void {
        this.uidSocketIds.set(uid, socket.id)
    }
    unbindUid(uid: number): void {
        this.uidSocketIds.delete(uid)
    }

    abstract send(socket: T, name: string | number, data: any): void;

    sendTo(uid: number, name: string, data: any): void {
        const tcpSocket = this.clients.get(uid);
        if (!tcpSocket) {
          return;
        }
        this.send(tcpSocket, name, data)
    }
    sendToUid(uid: number, name: string, data: any): void {
        const socketId = this.uidSocketIds.get(uid)

        if (!socketId) {
          return;
        }
        this.sendTo(socketId, name, data)
    }
    reply(socketId: number, requestId: number, data: any): void {
        const sws = this.clients.get(socketId);
        if (!sws) {
          return;
        }
        this.send(sws, requestId, data)
    }
    
    isDebug = false
}