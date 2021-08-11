/**
 * This file was generated by farrow-api
 * Don't modify it manually
 */

import { apiPipeline } from 'farrow-api-client'

/**
 * {@label AddTodoInput}
 */
export type AddTodoInput = {
  /**
   * @remarks a content of todo for creating
   */
  content: string
}

/**
 * {@label AddTodoOutput}
 */
export type AddTodoOutput = {
  /**
   * @remarks Todo list
   */
  todos: Todo[]
}

/**
 * {@label Todo}
 */
export type Todo = {
  /**
   * @remarks Todo id
   */
  id: number
  /**
   * @remarks Todo content
   */
  content: string
  /**
   * @remarks Todo status
   */
  completed: boolean
}

/**
 * {@label RemoveTodoInput}
 */
export type RemoveTodoInput = {
  /**
   * @remarks Todo id for removing
   */
  id: number
}

/**
 * {@label RemoveTodoOutput}
 */
export type RemoveTodoOutput = {
  /**
   * @remarks Remain todo list
   */
  todos: Todo[]
}

export const url = 'http://localhost:3002/api/todo'

export const api = {
  /**
   * @remarks add todo
   */
  addTodo: (input: AddTodoInput) => apiPipeline.invoke(url, { path: ['addTodo'], input }) as Promise<AddTodoOutput>,
  /**
   * @remarks remove todo
   */
  removeTodo: (input: RemoveTodoInput) =>
    apiPipeline.invoke(url, { path: ['removeTodo'], input }) as Promise<RemoveTodoOutput>,
}
