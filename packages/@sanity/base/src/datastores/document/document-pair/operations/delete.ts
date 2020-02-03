import {OperationArgs} from '../../types'
import {isLiveEditEnabled} from '../utils/isLiveEditEnabled'
import client from 'part:@sanity/base/client'

export const del = {
  disabled: ({snapshots}) => (snapshots.draft || snapshots.published ? false : 'NOTHING_TO_DELETE'),
  execute: ({idPair, typeName}: OperationArgs) => {
    const tx = client.observable.transaction().delete(idPair.draftId)

    if (isLiveEditEnabled(typeName)) {
      return tx.commit()
    }

    return tx.delete(idPair.publishedId).commit()
  }
}
