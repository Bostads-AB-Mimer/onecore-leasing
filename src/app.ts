import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'

import api from './api'
import errorHandler from './middlewares/error-handler'
import { logger, loggerMiddlewares } from 'onecore-utilities'

const app = new Koa()

import { koaSwagger } from 'koa2-swagger-ui'
import { SwaggerRouter } from 'koa-swagger-decorator'
const swaggerRouter = new SwaggerRouter()

app.use(cors())

//const swaggerJsdoc = import('swagger-jsdoc');
import swaggerJsdoc from 'swagger-jsdoc'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hello World',
      version: '1.0.0',
    },
  },
  apis: ['./src/services/lease-service/routes/*.ts'],
  servers: [
    {
      url: 'http://localhost:3000',
    },
  ],
}

const swaggerSpec = swaggerJsdoc(options)

console.log('spec: ')
console.log(swaggerSpec)

// app.use(
//   koaSwagger({
//     routePrefix: '/swagger',
//     swaggerOptions: {
//       url: 'http://petstore.swagger.io/v2/swagger.json', // example path to json
//       //spec: swaggerSpec,
//     },
//   })
// )

app.use(
  koaSwagger({
    routePrefix: '/swagger',
    swaggerOptions: {
      url: '/swagger.json',
    },
  })
)

/*swaggerRouter.swagger({
  title: 'API Documentation',
  description: 'API Documentation for Koa TypeScript API',
  version: '1.0.0',
})

swaggerRouter.mapDir('src/services/lease-service/routes')

app.use(swaggerRouter.routes()).use(swaggerRouter.allowedMethods())*/

app.on('error', (err) => {
  logger.error(err)
})

app.use(errorHandler())

app.use(bodyParser())

// Log the start and completion of all incoming requests
app.use(loggerMiddlewares.pre)
app.use(loggerMiddlewares.post)

app.use(api.routes())

export default app
