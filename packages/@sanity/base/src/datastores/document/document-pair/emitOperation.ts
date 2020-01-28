import {Subject} from 'rxjs'
import {PublicOperations} from './operations/api'

interface OperationEvent {
  operationName: keyof PublicOperations
  args: any[]
}

const subject$ = new Subject<OperationEvent>()

export function emitOperation(operationName, args) {
  subject$.next({operationName, args})
}

export const operations$ = subject$.asObservable()
