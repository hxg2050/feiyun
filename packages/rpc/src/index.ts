import { Feiyun, FeiyunClient } from "feiyun";

const parseUrl = (url: string): [string, string, number] => {
    const urls = url.split('://');
    const protocol = urls[0];
    const urlss = urls[1].split(':');
    const host = urlss[0];
    const port = Number(urlss[1]);
    return [
        protocol,
        host,
        port
    ]
}

export class RpcServer {

    handlers: Record<string, Function> = {};

    server: Feiyun;

    constructor(protocol: string, host: string, port: number) {
        this.server = new Feiyun({
            host,
            port
        });
        this.server.use(async (ctx, next) => {
            const res = await this.handlers[ctx.request.url]?.(ctx.request.data);
            ctx.response.data = res;
            next();
        });
        this.server.start();
    }


    api(name: string, fn: <T>(arg?: T) => unknown | PromiseLike<unknown>) {
        this.handlers[name] = fn;
    }

    static create(url: string): RpcServer {
        return new RpcServer(...parseUrl(url));
    }
}

export class RpcClient {
    socket: FeiyunClient;
    constructor(protocol: string, host: string, port: number) {
        this.socket = new FeiyunClient({
            url: protocol + '://' + host + ':' + port
        });
        this.socket.on('connect', () => {
            console.log('连接成功');
        });
    }

    call<T>(name: string, arg?: any): Promise<T> {
        return this.socket.request(name, arg) as Promise<T>;
    }

    static connect(url: string) {
        return new RpcClient(...parseUrl(url));
    }
}

const server = RpcServer.create('ws://127.0.0.1:1234');
server.api('login', () => {
    console.log('login');
    return {
        a: 1
    };
});

setTimeout(() => {
    console.log('开始连接服务器');
    const client = RpcClient.connect('ws://127.0.0.1:1234');
    client.call('login').then(res => {
        console.log('res:', res);
    });
}, 500);