import {OperationArgs} from '../../types'
import historyStore from 'part:@sanity/base/datastore/history'

export const restore = {
  disabled: (): false => false,
  execute: ({idPair}: OperationArgs, fromRevision: string) => {
    historyStore.restore(idPair.publishedId, fromRevision).subscribe()
  }
}
