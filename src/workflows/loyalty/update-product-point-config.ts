import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  upsertVariantPointConfigStep,
  UpsertVariantPointConfigStepInput,
} from "./steps/upsert-product-point-config"

type UpdateVariantPointConfigWorkflowInput = {
  variant_id: string
  payment_type: "currency" | "points" | "both"
  point_price: number | null
}

export const updateVariantPointConfigWorkflow = createWorkflow(
  "update-variant-point-config",
  function (input: UpdateVariantPointConfigWorkflowInput) {
    const config = upsertVariantPointConfigStep(
      input as unknown as UpsertVariantPointConfigStepInput
    )

    return new WorkflowResponse(config)
  }
)
