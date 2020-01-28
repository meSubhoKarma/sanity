import {OperationArgs} from '../../types'
import {merge} from 'rxjs'
import {isLiveEditEnabled} from '../utils/isLiveEditEnabled'

export const del = {
  disabled: ({snapshots}) => (snapshots.draft || snapshots.published ? false : 'NOTHING_TO_DELETE'),
  execute: ({draft, published, typeName}: OperationArgs) => {
    if (!isLiveEditEnabled(typeName)) {
      draft.mutate([draft.delete()])
    }
    published.mutate([published.delete()])
    return merge(draft.commit(), published.commit())
  }
}
