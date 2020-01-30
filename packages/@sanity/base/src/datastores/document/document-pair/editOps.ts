/* eslint-disable @typescript-eslint/no-use-before-define */
import {combineLatest, concat, of, Observable} from 'rxjs'
import {map, switchMap, refCount, publishReplay} from 'rxjs/operators'
import {snapshotPair} from './snapshotPair'
import {IdPair, OperationArgs} from '../types'
import {createObservableCache} from '../utils/createObservableCache'
import {createOperationsAPI, GUARDED, PublicOperations} from './operations/api'

const cacheOn = createObservableCache<PublicOperations>()

export function editOpsOf(idPair: IdPair, typeName: string): Observable<PublicOperations> {
  return concat(
    of(GUARDED),
    snapshotPair(idPair).pipe(
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
      map(createOperationsAPI)
    )
  ).pipe(publishReplay(1), refCount(), cacheOn(idPair.publishedId))
}
