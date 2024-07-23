import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'

import api from './api'
import errorHandler from './middlewares/error-handler'
import { logger, loggerMiddlewares } from 'onecore-utilities'

const app = new Koa()

app.use(cors())

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
