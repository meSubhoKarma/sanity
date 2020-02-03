import {defer, merge, Observable, of, Subject} from 'rxjs'
import {operations, PublicOperations} from './operations/api'
import {IdPair} from '../types'
import {
  catchError,
  filter,
  last,
  map,
  mergeMap,
  switchMap,
  take,
  withLatestFrom
} from 'rxjs/operators'
import {operationArgs} from './operationArgs'
import {createObservableCache} from '../utils/createObservableCache'
import {consistencyStatus} from './consistencyStatus'

interface ExecuteArgs {
  operationName: keyof PublicOperations
  publishedId: string
  extraArgs: any[]
}

function maybeObservable(v: void | Observable<any>) {
  return typeof v === 'undefined' ? of(null) : v
}

const execute = (operationName, operationArgs, extraArgs): Observable<any> => {
  const operation = operations[operationName]
  return defer(() =>
    merge(of(null), maybeObservable(operation.execute(operationArgs, ...extraArgs)))
  ).pipe(last())
}

const emissions$ = new Subject<ExecuteArgs>()

export function emitOperation(
  operationName: keyof PublicOperations,
  publishedId: string,
  extraArgs: any[]
) {
  emissions$.next({operationName, publishedId, extraArgs})
}

const cacheOn = createObservableCache<any>()

const REQUIRES_CONSISTENCY = ['publish', 'unpublish', 'discardChanges', 'delete']

export function operationExecutions(idPair: IdPair, typeName: string) {
  const consistency$ = consistencyStatus(idPair)
  return emissions$.pipe(
    filter(emission => emission.publishedId === idPair.publishedId),
    withLatestFrom(operationArgs(idPair, typeName), consistency$),
    switchMap(([emission, operationArgs, isConsistent]) => {
      const ready$ =
        REQUIRES_CONSISTENCY.includes(emission.operationName) && !isConsistent
          ? merge(
              operationArgs.published.commit(),
              operationArgs.draft.commit(),
              consistency$.pipe(
                filter(isConsistent => isConsistent),
                take(1)
              )
            )
          : of(null)

      return ready$.pipe(
        mergeMap(() => execute(emission.operationName, operationArgs, emission.extraArgs)),
        map(() => ({
          type: 'success',
          op: emission.operationName,
          id: idPair.publishedId
        })),
        catchError(err => of({type: 'error', op: emission.operationName, error: err}))
      )
    }),
    cacheOn(idPair.publishedId)
  )
}
