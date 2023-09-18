import { WebSocket } from "ws";
import { GameSocketServer } from "./GameSocketServer";

export class GameSocket {
    constructor(public id: number, public server: GameSocketServer, public socket: WebSocket) {

    }

    data: Record<string, any> = {};

    /**
     * 绑定数据
     */
    bind(name: string, value: any) {
        this.data[name] = value;
    }

    private _uid?: number | string;
    get uid() {
        return this._uid;
    }
    set uid(val) {
        this._uid = val;
        if (this._uid !== undefined) {
            this.server.clientsFromUid.set(this._uid, this);
        }
    }

    /**
     * 发送消息
     */
    send(name: string, data?: any) {
        this.server.send(this.socket, name, data);
    }
}