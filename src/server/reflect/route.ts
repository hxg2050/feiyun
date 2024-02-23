import 'reflect-metadata'

const PATH_METADATA = 'path'
const METHOD_METADATA = 'method'
const PARAM_METADATA = 'param'
const PARAM_VALIDATE_METADATA = 'param_validate'

/**
 * 类装饰
 * @param path 路径
 * @returns
 */
export const Handler = (path?: string): ClassDecorator => {
  return (target) => {
    path = path === undefined ? target.name : path
    Reflect.defineMetadata(PATH_METADATA, path, target)
  }
}
// export const log = (target, name) => {
//     console.log('log属性装饰器函数被调用');
//     console.log('target:', target)
//     console.log('name:', name)
//     const types = Reflect.getMetadata("design:type", target, name);

//     console.log('type:', types);

// }
/**
 * 方法装饰
 * @param path 路径
 * @returns
 */
export const Method = (path?: string): MethodDecorator => {
  return (target, key, descriptor: any) => {
    if (typeof key === 'string') {
      path = path === undefined ? key : path
      Reflect.defineMetadata(METHOD_METADATA, path, descriptor.value)
    }
  }
}

/**
 * 参数装饰
 * @param name 参数名
 * @param checker 检查器/处理器
 * @returns
 */
export const Param = (name: string, checker?: (val: any) => void): ParameterDecorator => {
  return (target, key, index) => {
    if (!key) {
      return
    }

    const param = Reflect.get(target, key)
    let params = Reflect.getMetadata(PARAM_METADATA, param)
    if (!params) {
      params = []
    }
    params.push([index, name, checker])
    Reflect.defineMetadata(PARAM_METADATA, params, param)
  }
}

/**
 * 声明参数需要进行校验，并用目标类型重新实例
 * @param target
 * @param key
 * @param index
 */
export const ParamType: ParameterDecorator = (target, key, index) => {
  if (!key) {
    return
  }
  const types = Reflect.getMetadata('design:paramtypes', target, key)
  // console.log(Object.getOwnPropertyDescriptors(Reflect.ownKeys(types[index].prototype)));
  Reflect.defineMetadata(PARAM_VALIDATE_METADATA, types[index], Reflect.get(target, key))
}

const METHOD_DOC_METADATA = 'method_doc'

interface Options {
  /**
   * 标题
   */
  title: string
  /**
   * 描述
   */
  description: string
}
/**
 * 文档
 */
export const ApiDoc = (options: Options): MethodDecorator => {
  return (target, key, descriptor: any) => {
    Reflect.defineMetadata(METHOD_DOC_METADATA, options, descriptor.value)
  }
}

export const mapRoute = (handlers: any[]) => {
  const all = new Map()

  for (const handler_ of handlers) {
    const handler = new handler_()
    const prototype = Object.getPrototypeOf(handler) as ClassDecorator
    // 取出路径
    const handlerPathMeta = Reflect.getMetadata(PATH_METADATA, prototype.constructor)
    const methods = Object.getOwnPropertyNames(prototype).filter((item) => {
      // 构造函数，暂时不处理
      if (item === 'constructor') {
        return false
      }
      return typeof Reflect.get(prototype, item) === 'function'
    })

    methods.forEach((methodName) => {
      const method = Reflect.get(prototype, methodName)
      const methodPath = Reflect.getMetadata(METHOD_METADATA, method)
      if (!methodPath) {
        return
      }
      const path = `${handlerPathMeta}/${methodPath}`

      all.set(path, {
        method: method.bind(handler),
        validate: Reflect.getMetadata(PARAM_VALIDATE_METADATA, method),
        doc: Reflect.getMetadata(METHOD_DOC_METADATA, method),
      })
    })
  }

  return all
}
