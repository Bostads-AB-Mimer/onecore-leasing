import KoaRouter from '@koa/router'
import { generateRouteMetadata } from 'onecore-utilities'
import { getCreditInformation } from './adapters/creditsafe-adapter'

export const routes = (router: KoaRouter) => {
  router.get('(.*)/cas/getConsumerReport/:pnr', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    const responseData = await getCreditInformation(ctx.params.pnr)

    ctx.body = {
      content: responseData,
      ...metadata,
    }
  })
}
