import {OperationArgs} from '../../types'
import {merge} from 'rxjs'
import {omit} from 'lodash'

export const unpublish = {
  disabled: ({snapshots}: OperationArgs) => {
    return snapshots.published ? false : 'NOT_PUBLISHED'
  },
  execute: ({idPair, snapshots, published, draft}: OperationArgs) => {
    if (snapshots.published) {
      draft.createIfNotExists({
        ...omit(snapshots.published, '_updatedAt'),
        _id: idPair.draftId
      })
    }
    published.delete()
    return merge(draft.commit(), published.commit())
  }
}
