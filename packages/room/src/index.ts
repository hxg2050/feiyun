import EventEmitter from "eventemitter3"
import { Context } from "feiyun";

export enum RoomEvent {
    JOIN = 'JOIN',
    LEAVE = 'LEAVE'
}

export class Room extends EventEmitter {
    list: Context[] = [];
    join(ctx: Context) {
        this.list.push(ctx);
        this.emit(RoomEvent.JOIN, ctx);
    }

    leave(ctx: Context) {
        const index = this.list.indexOf(ctx);
        if (index !== -1) {
            this.list.splice(index, 1);
            this.emit(RoomEvent.LEAVE, ctx);
        }
    }

    send(name: string, message: any) {
        for (const ctx of this.list) {
            ctx.socket.send(name, JSON.stringify(message));
        }
    }

    destroy() {
        this.list = [];
        this.removeAllListeners();
    }
}