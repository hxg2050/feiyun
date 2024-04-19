import type { Socket } from './socket'
import { compose, type Middleware } from './compose'
import { Server } from './server'

export interface ApplicationConfig {
  host: string
  port: number
}

export class Request {
  id!: number
  url: string = ''
  data: any
}

export class Response {
  data: any
}

export class Context {
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

  listen() {
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

  use(fn: FeiyunMiddleware) {
    this.middleware.push(fn)
    return this
  }

  async responseHandler(ctx: Context) {
    if (ctx.response.data) {
      ctx.socket.send(ctx.request.id, ctx.response.data);
      // this.server.reply(ctx.socket.socket, ctx.request.id, ctx.response.data)
    }
  }
}