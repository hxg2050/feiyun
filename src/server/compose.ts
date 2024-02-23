export type Next = () => Promise<any>
export type Middleware<T> = (context: T, next: Next) => Promise<any>

/**
 * source koa-compose
 * Compose `middleware` returning
 * a fully valid middleware comprised
 * of all those which are passed.
 *
 * @param {Array} middleware
 * @return {Function}
 * @api public
 */

export const compose = <T>(middleware: Array<Middleware<T>>) => {
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }

  /**
   * @param {object} context
   * @return {Promise}
   * @api public
   */

  return function (context: T, next: Next) {
    // last called middleware #
    let index = -1
    return dispatch(0)
    function dispatch(i: number): any {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))
      } catch (error) {
        return Promise.reject(error)
      }
    }
  }
}
