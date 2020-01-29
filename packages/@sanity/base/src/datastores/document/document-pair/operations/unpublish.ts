import {OperationArgs} from '../../types'
import {merge} from 'rxjs'

export const unpublish = {
  disabled: ({snapshots}: OperationArgs) => {
    return snapshots.published ? false : 'NOT_PUBLISHED'
  },
  execute: ({snapshots, published, draft}: OperationArgs) => {
    if (snapshots.published) {
      draft.mutate([
        draft.createIfNotExists({
          ...snapshots.published
        })
      ])
    }
    published.mutate([published.delete()])
    return merge(draft.commit(), published.commit())
  }
}
