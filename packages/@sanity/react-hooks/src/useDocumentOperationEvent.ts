import documentStore from 'part:@sanity/base/datastore/document'
import {toObservable, useObservable} from './utils/use-observable'
import {distinctUntilChanged, filter, switchMap} from 'rxjs/operators'

export function useDocumentOperationEvent(publishedId, typeName) {
  return useObservable(
    toObservable({publishedId, typeName}, props$ =>
      props$.pipe(
        distinctUntilChanged(
          (curr, next) => curr.publishedId === next.publishedId && curr.typeName === next.typeName
        ),
        switchMap(({publishedId, typeName}) => {
          return documentStore.local.operationEvents$.pipe(
            filter((event: any) => event.id === publishedId)
          )
        })
      )
    )
  )
}
