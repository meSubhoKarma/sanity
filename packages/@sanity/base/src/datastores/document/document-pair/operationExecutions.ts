import {defer, merge, Observable, of, Subject} from 'rxjs'
import {operations, PublicOperations} from './operations/api'
import {IdPair} from '../types'
import {filter, last, map, mergeMap, withLatestFrom} from 'rxjs/operators'
import {operationArgs} from './operationArgs'
import {createObservableCache} from '../utils/createObservableCache'

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

export function operationExecutions(idPair: IdPair, typeName: string) {
  return emissions$.pipe(
    filter(emission => emission.publishedId === idPair.publishedId),
    withLatestFrom(operationArgs(idPair, typeName)),
    mergeMap(([emission, operationArgs]) => {
      return execute(emission.operationName, operationArgs, emission.extraArgs).pipe(
        map(() => ({
          type: 'success',
          op: emission.operationName,
          id: idPair.publishedId
        }))
      )
    }),
    cacheOn(idPair.publishedId)
  )
}
