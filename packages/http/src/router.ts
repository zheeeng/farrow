import path from 'path'
import { match as createMatch } from 'path-to-regexp'

import { createPipeline, Next, RunPipelineOptions, useContext, MiddlewareInput } from 'farrow-pipeline'
import * as Schema from 'farrow-schema'
import { Validator, createStrictValidator, createNonStrictValidator } from 'farrow-schema/validator'

import { MaybeAsyncResponse, match as matchType, Response } from './response'
import { BodyMap } from './responseInfo'
import { route as createRoute } from './basenames'
import { Prettier } from 'farrow-schema'

export type RouterSchemaDescriptor =
  | Schema.FieldDescriptors
  | (new () => Schema.ObjectType)
  | (new () => Schema.StructType)

export type RouterRequestSchema = {
  pathname: string
  method?: string
  params?: RouterSchemaDescriptor
  query?: RouterSchemaDescriptor
  body?: Schema.FieldDescriptor | Schema.FieldDescriptors
  headers?: RouterSchemaDescriptor
  cookies?: RouterSchemaDescriptor
}

export type TypeOfRouterRequestField<T> = T extends string
  ? string
  : T extends Schema.FieldDescriptors
  ? Schema.TypeOf<Schema.StructType<T>>
  : T extends Schema.FieldDescriptor
  ? Schema.TypeOfFieldDescriptor<T>
  : never

export type TypeOfRequestSchema<T extends RouterRequestSchema> = Prettier<
  {
    [key in keyof T]: TypeOfRouterRequestField<T[key]>
  }
>

const createRequestValidator = <T extends RouterRequestSchema>(
  options: T,
  strict = false,
): Validator<TypeOfRequestSchema<T>> => {
  let descriptors = {} as Schema.FieldDescriptors

  if (typeof options.pathname === 'string') {
    descriptors.pathname = Schema.String
  }

  if (typeof options.method === 'string') {
    descriptors.method = Schema.String
  }

  if (options.params) {
    descriptors.params = options.params
  }

  if (options.query) {
    descriptors.query = options.query
  }

  if (options.body) {
    descriptors.body = options.body
  }

  if (options.headers) {
    descriptors.headers = options.headers
  }

  if (options.cookies) {
    descriptors.cookies = options.cookies
  }

  let RequestStruct = Schema.Struct(descriptors)

  if (strict) {
    return createStrictValidator(RequestStruct as any)
  } else {
    return createNonStrictValidator(RequestStruct as any)
  }
}

export type RouterInput = {
  pathname: string
  method?: string
}

export type RouterPipeline<I, O> = {
  middleware: <II extends RouterInput>(input: II, next: Next<II, O>) => O
  use: (...args: [path: string, middleware: MiddlewareInput<I, O>] | [middleware: MiddlewareInput<I, O>]) => void
  run: <II extends RouterInput>(input: II, options?: RunPipelineOptions<I, O>) => O
  match: <T extends keyof BodyMap>(type: T, f: (body: BodyMap[T]) => MaybeAsyncResponse) => void
  route: (name: string, middleware: MiddlewareInput<I, O>) => void
  serve: (name: string, dirname: string) => void
}

export type RouterPipelineOptions = {
  strict: boolean
}

export const createRouterPipeline = <T extends RouterRequestSchema>(
  routerRequestSchema: T,
  options?: RouterPipelineOptions,
): RouterPipeline<TypeOfRequestSchema<T>, MaybeAsyncResponse> => {
  type Input = TypeOfRequestSchema<T>
  type Output = MaybeAsyncResponse
  type ResultPipeline = RouterPipeline<Input, Output>

  let pipeline = createPipeline<Input, Output>()

  let validator = createRequestValidator(routerRequestSchema, options?.strict)

  let matcher = createMatch(routerRequestSchema.pathname)

  let match: ResultPipeline['match'] = (type, f) => {
    pipeline.use(matchType(type, f))
  }

  let route: ResultPipeline['route'] = (name, middleware) => {
    pipeline.use(createRoute(name, middleware))
  }

  let use: ResultPipeline['use'] = (...args) => {
    if (args.length === 1) {
      pipeline.use(args[0])
    } else {
      route(...args)
    }
  }

  let run: ResultPipeline['run'] = (input, options) => {
    if (typeof routerRequestSchema.method === 'string') {
      if (routerRequestSchema.method.toLowerCase() !== input.method?.toLowerCase()) {
        throw new Error(`Expected method to be ${routerRequestSchema.method}, but received ${input.method}`)
      }
    }

    let matches = matcher(input.pathname)

    if (!matches) {
      throw new Error(`${routerRequestSchema.pathname} is not matched, received: ${input.pathname}`)
    }

    let params = matches.params

    let result = validator({
      ...input,
      params,
    })

    if (result.isErr) {
      throw new Error(result.value.message)
    }

    return pipeline.run(result.value, options)
  }

  let middleware: ResultPipeline['middleware'] = (input, next) => {
    let context = useContext()
    return run(input, {
      context,
      onLast: () => next(),
    })
  }

  let serve: ResultPipeline['serve'] = (name: string, dirname: string) => {
    route(name, (request) => {
      let filename = path.join(dirname, request.pathname)
      return Response.file(filename)
    })
  }

  return {
    middleware,
    use: use,
    run: run,
    match: match,
    route: route,
    serve: serve,
  }
}
