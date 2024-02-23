import type { Socket } from './socket'
import { compose, type Middleware } from './compose'
import { Server } from './server'

export interface ApplicationConfig {
  host: string
  port: number
}

class Request {
  id!: number
  url: string = ''
  data: any
}

class Response {
  data: any
}

class Context {
  socket!: Socket
  request!: Request
  response!: Response
}

export type FeiyunMiddleware = Middleware<Context>

export class Feiyun {
  public middleware: FeiyunMiddleware[] = []

  public config: ApplicationConfig = {
    host: '0.0.0.0',
    port: 3000,
  }

  public server!: Server

  constructor(config: Partial<ApplicationConfig> = {}) {
    this.config = { ...this.config, ...config }
  }

  listen(port?: number) {
    // const wss = new WebSocketServer(this.config);
    // wss.on('connection', (ws, request) => {
    //     ws.on('open', () => {

    //     });
    //     ws.on('message', () => {

    //     });
    //     ws.on('error', () => {

    //     });
    //     ws.on('close', () => {

    //     });
    // });
    // wss.on('close', () => {

    // });

    // wss.on('error', () => {

    // });
    this.server = new Server(this.config)
    this.server.start()
    this.server.handlerCallback = (client, data) => {
      const ctx = new Context()
      ctx.socket = client
      try {
        const msg = JSON.parse(data)

        const [rid, route, reqData]: [number, string, any] = msg
        const req = new Request()
        req.id = rid
        req.url = route
        req.data = reqData

        ctx.request = req
        ctx.response = new Response()

        compose(this.middleware)(ctx, this.responseHandler.bind(this) as any)
      } catch (error) {
        console.error(error)
      }
    }
    console.log('server listen:', `ws://${this.config.host}:${this.config.port}`)
  }

  // callback() {
  //     const ctx = new Context();
  //     return (client, data) => {

  //     }
  // }

  use(fn: FeiyunMiddleware) {
    this.middleware.push(fn)
    return this
  }

  async responseHandler(ctx: Context) {
    if (ctx.response.data) {
      this.server.reply(ctx.socket.socket, ctx.request.id, ctx.response.data)
    }
  }
}

// const app = new Feiyun();
// app.use(async (ctx, next) => {
//     const msg = JSON.parse(ctx.message);
//     const [rid, route, req]: [number, string, any] = msg;

//     const handler = this.handlers.get(route);

//     ctx.response.body = await handler();

//     if (!handler) {
//         return;
//     }

//     const res = await handler(req, client);

//     // 如果有返回值，那么直接回应
//     if (res) {
//         this.reply(client.socket, rid, res);
//     }
// });
