/* eslint-disable @typescript-eslint/no-use-before-define */
import {combineLatest, concat, of, Observable, EMPTY, merge} from 'rxjs'
import {
  map,
  switchMap,
  refCount,
  publishReplay,
  share,
  concatMap,
  mergeMapTo,
  withLatestFrom
} from 'rxjs/operators'
import {snapshotPair} from './snapshotPair'
import {IdPair, OperationArgs} from '../types'
import {createObservableCache} from '../utils/createObservableCache'
import {createOperationsAPI, GUARDED, operations, PublicOperations} from './operations/api'
import {operations$} from './emitOperation'

const cacheOn = createObservableCache<PublicOperations>()

function toObservable(v) {
  return typeof v === 'undefined' ? of(null) : v
}

export function editOpsOf(idPair: IdPair, typeName: string): Observable<PublicOperations> {
  const args$ = snapshotPair(idPair).pipe(
    switchMap(versions =>
      combineLatest([versions.draft.snapshots$, versions.published.snapshots$]).pipe(
        map(
          ([draft, published]): OperationArgs => ({
            idPair,
            typeName: typeName,
            snapshots: {draft, published},
            draft: versions.draft,
            published: versions.published
          })
        )
      )
    ),
    share()
  )

  const ops$ = args$.pipe(map(createOperationsAPI), share())

  const executions$ = operations$.pipe(
    withLatestFrom(args$),
    concatMap(([operationRequest, operationArgs]) => {
      const operation = operations[operationRequest.operationName]
      // console.group(`operation on ${idPair.publishedId}`)
      // console.log('executing %s(', operationRequest.operationName, ...operationRequest.args, ')')
      // console.time('execution')
      const result = operation.execute(operationArgs, ...operationRequest.args)
      // console.timeEnd('execution')
      // console.groupEnd()
      return toObservable(result)
    }),
    mergeMapTo(EMPTY)
  )

  return merge(concat(of(GUARDED), ops$), executions$).pipe(
    publishReplay(1),
    refCount(),
    cacheOn(idPair.publishedId)
  )
}
