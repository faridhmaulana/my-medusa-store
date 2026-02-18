import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  deductBalanceStep,
  DeductBalanceStepInput,
} from "./steps/deduct-balance"

type DeductPointsWorkflowInput = {
  customer_id: string
  points: number
  reason?: string
}

export const deductPointsWorkflow = createWorkflow(
  "deduct-points",
  function (input: DeductPointsWorkflowInput) {
    const balance = deductBalanceStep(
      input as unknown as DeductBalanceStepInput
    )

    return new WorkflowResponse(balance)
  }
)
