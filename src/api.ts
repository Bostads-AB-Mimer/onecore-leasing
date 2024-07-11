import KoaRouter from '@koa/router'

import { routes as newLeaseRoutes } from './services/lease-service/updated_index'
import { routes as leaseRoutes } from './services/lease-service/index' //todo: remove after merge
import { routes as creditSafeRoutes } from './services/creditsafe'
import { routes as healthRoutes } from './services/health-service'
import { routes as swagggerRoutes } from './services/swagger'

const router = new KoaRouter()

newLeaseRoutes(router)
//leaseRoutes(router)
creditSafeRoutes(router)
healthRoutes(router)
swagggerRoutes(router)

export default router
