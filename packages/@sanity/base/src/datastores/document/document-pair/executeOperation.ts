import {defer, EMPTY, merge, Observable, of, Subject} from 'rxjs'
import {operations, PublicOperations} from './operations/api'
import {OperationArgs} from '../types'
import {catchError, concatMap, filter, last, map, onErrorResumeNext, share, take} from 'rxjs/operators'

type OperationRequestWithId = [number, ExecuteArgs]

let reqId = 0
const reqs$ = new Subject<OperationRequestWithId>()

interface ExecuteArgs {
  operationName: keyof PublicOperations
  operationArgs: OperationArgs
  extraArgs: any[]
}

function maybeObservable(v: void | Observable<any>) {
  return typeof v === 'undefined' ? of(null) : v
}

const execute = (operationName, operationArgs, extraArgs): Observable<any> => {
  const operation = operations[operationName]
  return defer(() => maybeObservable(operation.execute(operationArgs, ...extraArgs)))
}

type ExecuteResult = any
const processedReqs$ = reqs$.pipe(
  concatMap(([id, args]) => {
    return merge(of(null), execute(args.operationName, args.operationArgs, args.extraArgs)).pipe(
      last(),
      map((): [number, ExecuteResult] => [
        id,
        {
          type: 'success',
          op: args.operationName,
          id: args.operationArgs.idPair.publishedId
        }
      ]),
      catchError(err => {
        return of([
          id,
          {
            type: 'error',
            op: args.operationName,
            id: args.operationArgs.idPair.publishedId,
            error: err
          }
        ])
      })
    )
  }),
  onErrorResumeNext(),
  share()
)

export function executeOperation(
  operationName: keyof PublicOperations,
  operationArgs: OperationArgs,
  extraArgs
) {
  const id = reqId++
  return merge(
    processedReqs$.pipe(
      filter(([reqId]) => reqId === id),
      map(([, res]) => res),
      take(1)
    ),
    defer(() => {
      reqs$.next([id, {operationName, operationArgs, extraArgs}])
      return EMPTY
    })
  )
}

export const operationEvents$ = processedReqs$.pipe(map(([id, res]) => res))
