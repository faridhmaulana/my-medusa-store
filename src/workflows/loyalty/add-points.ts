import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  getOrCreateBalanceStep,
  GetOrCreateBalanceStepInput,
} from "./steps/get-or-create-balance"

type AddPointsWorkflowInput = {
  customer_id: string
  points: number
  reason?: string
}

export const addPointsWorkflow = createWorkflow(
  "add-points",
  function (input: AddPointsWorkflowInput) {
    const balance = getOrCreateBalanceStep(
      input as unknown as GetOrCreateBalanceStepInput
    )

    return new WorkflowResponse(balance)
  }
)
