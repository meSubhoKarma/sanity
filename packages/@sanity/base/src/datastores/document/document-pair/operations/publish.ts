import {OperationArgs} from '../../types'

import {omit} from 'lodash'
import {isLiveEditEnabled} from '../utils/isLiveEditEnabled'
import {merge} from 'rxjs'

const id = <T>(id: T): T => id

export const publish = {
  disabled: ({typeName, snapshots}: OperationArgs) => {
    if (isLiveEditEnabled(typeName)) {
      return 'LIVE_EDIT_ENABLED'
    }
    if (!snapshots.draft) {
      return snapshots.published ? 'ALREADY_PUBLISHED' : 'NO_CHANGES'
    }
    return false
  },
  execute: ({idPair, snapshots, draft, published}: OperationArgs) => {
    if (snapshots.published) {
      // If there is a published document already, we only want to update it if the revision on the remote server
      // matches what our local state thinks it's at
      published.mutate([
        // Hack until other mutations support revision locking
        ...published.patch([
          {unset: ['_revision_lock_pseudo_field_'], ifRevisionID: snapshots.published._rev}
        ]),
        published.createOrReplace({
          ...snapshots.draft,
          _id: idPair.publishedId
        })
      ])
    } else {
      // If the document has not been published, we want to create it - if it suddenly exists
      // before being created, we don't want to overwrite if, instead we want to yield an error
      published.mutate([
        published.create({
          ...snapshots.draft,
          _id: idPair.publishedId
        })
      ])
    }

    draft.mutate([draft.delete()])

    return merge(draft.commit(), published.commit())
  }
}
