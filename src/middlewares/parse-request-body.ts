import { ExtendableContext, Next } from 'koa'
import { z, ZodSchema } from 'zod'

type ContextWithParsedRequestBody<T extends ZodSchema> = ExtendableContext & {
  request: Request & { body: z.infer<T> }
}

export const parseRequestBody =
  <T extends ZodSchema>(schema: T) =>
  (ctx: ContextWithParsedRequestBody<T>, next: Next) => {
    const parseResult = schema.safeParse(ctx.request.body)
    if (!parseResult.success) {
      ctx.status = 400
      ctx.body = {
        status: 'error',
        data: parseResult.error.issues.map(({ message, path }) => ({
          message,
          path,
        })),
      }

      return
    }

    ctx.request.body = parseResult.data
    return next()
  }
