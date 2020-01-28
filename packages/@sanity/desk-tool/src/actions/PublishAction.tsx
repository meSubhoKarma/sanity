import * as React from 'react'
import {useDocumentOperation, useValidationStatus} from '@sanity/react-hooks'

const DISABLED_REASON_TITLE = {
  LIVE_EDIT_ENABLED: 'Cannot publish since liveEdit is enabled for this document type',
  ALREADY_PUBLISHED: 'Already published',
  NO_CHANGES: 'No unpublished changes'
}

export function PublishAction(props) {
  const {id, type, liveEdit, onComplete} = props

  if (liveEdit) {
    return {
      label: 'Publish',
      title:
        'Live Edit is enabled for this content type and publishing happens automatically as you make changes',
      disabled: true
    }
  }

  const {publish, patch}: any = useDocumentOperation(id, type)
  const [publishing, setPublishing] = React.useState(false)
  const [didPublish, setDidPublish] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const validationStatus = useValidationStatus(id, type)

  if (publishing) {
    return {disabled: true, label: 'Publishing…'}
  }

  if (didPublish) {
    return {
      disabled: true,
      label: 'Published!',
      dialog: {
        type: 'success',
        onClose: onComplete,
        title: 'Succesfully published document'
      }
    }
  }

  const hasValidationErrors = validationStatus.markers.length > 0

  const title = publish.disabled
    ? DISABLED_REASON_TITLE[publish.disabled] || ''
    : hasValidationErrors
    ? 'There are validation errors that needs to be fixed before this document can be published'
    : ''

  const disabled = Boolean(
    validationStatus.isValidating || hasValidationErrors || publishing || publish.disabled
  )

  return {
    disabled,
    label: 'Publish',
    title: title,
    shortcut: disabled ? null : 'ctrl+alt+p',
    onHandle: () => {
      setPublishing(true)
      setDidPublish(false)
      patch.execute([{set: {publishedAt: new Date().toISOString()}}])
      publish.execute().then(
        () => {
          setPublishing(false)
          setDidPublish(true)
        },
        err => setError(err)
      )
    },
    dialog: error && {
      type: 'error',
      onClose: () => setError(null),
      title: 'An error occured when publishing the document',
      content: error.message
    }
  }
}
