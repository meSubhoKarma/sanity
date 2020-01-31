/* eslint-disable @typescript-eslint/no-use-before-define */
import {concat, Observable, of} from 'rxjs'
import {map, publishReplay, refCount} from 'rxjs/operators'
import {IdPair} from '../types'
import {createObservableCache} from '../utils/createObservableCache'
import {createOperationsAPI, GUARDED, PublicOperations} from './operations/api'
import {operationArgs} from './operationArgs'

const cacheOn = createObservableCache<PublicOperations>()

export function editOpsOf(idPair: IdPair, typeName: string): Observable<PublicOperations> {
  return concat(of(GUARDED), operationArgs(idPair, typeName).pipe(map(createOperationsAPI))).pipe(
    publishReplay(1),
    refCount(),
    cacheOn(idPair.publishedId)
  )
}
