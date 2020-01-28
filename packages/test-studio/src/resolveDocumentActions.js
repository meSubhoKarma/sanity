import {defaultActions} from 'part:@sanity/base/document-actions'
import {
  ConfirmDialogAction,
  ModalDialogAction,
  PopoverDialogAction
} from './test-action-tool/actions/DialogActions'

function TestAction() {
  return {
    label: 'A custom action',
    title: `An action that doesn't do anything particular`
  }
}

export default function resolveDocumentActions(editState, type) {
  return [
    ...defaultActions,
    TestAction,
    PopoverDialogAction,
    ModalDialogAction,
    ConfirmDialogAction
  ]
}
