import * as React from 'react'
import Snackbar from 'part:@sanity/components/snackbar/default'
import {useDocumentOperationEvent} from '@sanity/react-hooks'

export function DocumentOperationResults(props: {id: string; type: string}) {
  const event: any = useDocumentOperationEvent(props.id, props.type)

  if (event && event.op === 'delete') {
    return (
      <Snackbar
        kind="success"
        title="This document is now deleted. If you continue editing it will be recreated. You can still recover the deleted version from history."
      />
    )
  }

  if (event && event.type === 'error') {
    return (
      <Snackbar
        kind="error"
        title={`An error occurred during ${event.op}: ${event.error.message}`}
      />
    )
  }
  return null
}
