import type { Socket } from './socket'
import { compose, type Middleware as KoaMiddleware } from './compose'
import { Server } from './server'
import { IServer } from './IServer'

export interface ApplicationConfig {
	host: string
	port: number
	customServer?: (config: ApplicationConfig) => IServer,
	debug: boolean
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

export type Middleware = KoaMiddleware<Context>

export class Applaction {
	public middleware: Middleware[] = []

	public config: ApplicationConfig = {
		host: '0.0.0.0',
		port: 3000,
		debug: false
	}

	public server!: IServer

	constructor(config: Partial<ApplicationConfig> = {}) {
		this.config = { ...this.config, ...config }
	}

	listen() {
		this.server = this.config.customServer ? this.config.customServer(this.config) : new Server({
			port: this.config.port,
			host: this.config.host
		})
		this.server.start()
		this.server.on('close', (client) => {
			client.close();
		});
		this.server.on('message', (client, data) => {
			try {
				const ctx = new Context()
				ctx.socket = client
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
		});
		console.log('server listen:', `ws://${this.config.host}:${this.config.port}`)
	}

	use(fn: Middleware) {
		this.middleware.push(fn)
		return this
	}

	async responseHandler(ctx: Context) {
		if (ctx.response.data != undefined) {
			this.server.reply(ctx.socket.id, ctx.request.id, ctx.response.data)
		}
	}

	start = this.listen;
}