import * as operations from './index'
import {OperationArgs} from '../../types'
import {emitOperation} from '../emitOperation'

export {operations}

/* Ok, this became a bit messy - sorry
 *  The important thing to consider here is the PublicOperations interface -
 *  as long as this is properly typed, how everything else is implemented doesn't matter
 *  */

interface GuardedOperation {
  disabled: 'NOT_READY'
  execute: () => never
}

type WrappedOperation<ErrorStrings> = {
  disabled: false | ErrorStrings
  execute: () => void
}

export type OperationImpl<ErrorStrings> = {
  disabled: (args: OperationArgs) => false | ErrorStrings
  execute(args: OperationArgs, ...extra: any[]): void
}

type Operation<DisabledReasons = false> = GuardedOperation | WrappedOperation<DisabledReasons>

// Note: Changing this interface in a backwards incompatible manner will be a breaking change
export interface PublicOperations {
  commit: Operation
  delete: Operation<'NOTHING_TO_DELETE'>
  del: Operation<'NOTHING_TO_DELETE'>
  publish: Operation<'LIVE_EDIT_ENABLED' | 'ALREADY_PUBLISHED' | 'NO_CHANGES'>
  patch: Operation<(patches: any[]) => void>
  discardChanges: Operation<'NO_CHANGES' | 'NOT_PUBLISHED'>
  unpublish: Operation<'NOT_PUBLISHED'>
  duplicate: Operation<'NOTHING_TO_DUPLICATE'>
  restore: Operation<(revision: string) => Promise<void>>
}

function createOperationGuard(opName: string): GuardedOperation {
  return {
    disabled: 'NOT_READY',
    execute: () => {
      throw new Error(`Called ${opName} before it was ready.`)
    }
  }
}

// This creates a version of the operations api that will throw if called.
// Most operations depend on having the "current document state" available locally and if an action gets called
// before we have the state available, we throw an error to signal "premature" invocation before ready
export const GUARDED: PublicOperations = {
  commit: createOperationGuard('commit'),
  delete: createOperationGuard('delete'),
  del: createOperationGuard('del'),
  publish: createOperationGuard('publish'),
  patch: createOperationGuard('patch'),
  discardChanges: createOperationGuard('discardChanges'),
  unpublish: createOperationGuard('unpublish'),
  duplicate: createOperationGuard('duplicate'),
  restore: createOperationGuard('restore')
}
const createEmitter = (operationName: keyof PublicOperations) => (...args: any[]) =>
  emitOperation(operationName, args)

export const emitters = {
  commit: createEmitter('commit'),
  delete: createEmitter('delete'),
  del: createEmitter('delete'),
  publish: createEmitter('publish'),
  patch: createEmitter('patch'),
  discardChanges: createEmitter('discardChanges'),
  unpublish: createEmitter('unpublish'),
  duplicate: createEmitter('duplicate'),
  restore: createEmitter('restore')
}

function wrap<ErrorStrings>(
  opName: keyof PublicOperations,
  op: OperationImpl<ErrorStrings>,
  operationArgs: OperationArgs
): WrappedOperation<ErrorStrings> {
  const disabled = op.disabled(operationArgs)
  return {
    disabled,
    execute: emitters[opName]
  }
}

export function createOperationsAPI(args: OperationArgs): PublicOperations {
  return {
    commit: wrap('commit', operations.commit, args),
    delete: wrap('delete', operations.delete, args),
    del: wrap('delete', operations.delete, args),
    publish: wrap('publish', operations.publish, args),
    patch: wrap('patch', operations.patch, args),
    discardChanges: wrap('discardChanges', operations.discardChanges, args),
    unpublish: wrap('unpublish', operations.unpublish, args),
    duplicate: wrap('duplicate', operations.duplicate, args),
    restore: wrap('restore', operations.restore, args)
  }
}
