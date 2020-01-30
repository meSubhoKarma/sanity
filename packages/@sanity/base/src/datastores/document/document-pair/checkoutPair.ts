import {getPairListener, ListenerEvent} from '../getPairListener'
import {BufferedDocumentEvent, createBufferedDocument} from '../buffered-doc/createBufferedDocument'
import {filter, map, share} from 'rxjs/operators'
import {IdPair, Mutation} from '../types'
import {merge, Observable} from 'rxjs'
import client from 'part:@sanity/base/client'

const isEventForDocId = (id: string) => (event: ListenerEvent): boolean =>
  event.type !== 'reconnect' && event.documentId === id

export function doCommit(client, mutations) {
  return client.observable.dataRequest('mutate', mutations, {
    visibility: 'async',
    returnDocuments: false
  })
}

export type DocumentVersionEvent = BufferedDocumentEvent & {version: 'published' | 'draft'}

export interface DocumentVersion {
  events: Observable<DocumentVersionEvent>

  patch: (patches) => Mutation[]
  create: (document) => Mutation
  createIfNotExists: (document) => Mutation
  createOrReplace: (document) => Mutation
  delete: () => Mutation

  mutate: (mutations: Mutation[]) => void
  commit: () => Observable<never>
}

export interface Pair {
  published: DocumentVersion
  draft: DocumentVersion
}

function setVersion(version: 'draft' | 'published') {
  return (ev: any): DocumentVersionEvent => ({...ev, version})
}

export function checkoutPair(idPair: IdPair): Pair {
  const {publishedId, draftId} = idPair

  const listenerEvents$ = getPairListener(client, idPair).pipe(share())

  const reconnect$ = listenerEvents$.pipe(filter(ev => ev.type === 'reconnect'))

  const _doCommit = mutations => doCommit(client, mutations)

  const draft = createBufferedDocument(
    draftId,
    listenerEvents$.pipe(filter(isEventForDocId(draftId))),
    _doCommit
  )

  const published = createBufferedDocument(
    publishedId,
    listenerEvents$.pipe(filter(isEventForDocId(publishedId))),
    _doCommit
  )

  return {
    draft: {
      ...draft,
      events: merge(reconnect$, draft.events).pipe(map(setVersion('draft')))
    },
    published: {
      ...published,
      events: merge(reconnect$, published.events).pipe(map(setVersion('published')))
    }
  }
}
