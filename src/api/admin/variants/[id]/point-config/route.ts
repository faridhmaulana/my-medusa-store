import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { POINT_BALANCE_MODULE } from "../../../../../modules/pointBalance"
import PointBalanceModuleService from "../../../../../modules/pointBalance/service"
import { updateVariantPointConfigWorkflow } from "../../../../../workflows/loyalty/update-product-point-config"
import { PostAdminVariantPointConfigSchemaType } from "../../../validators"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id: variant_id } = req.params
  const service: PointBalanceModuleService = req.scope.resolve(
    POINT_BALANCE_MODULE
  )

  const configs = await service.listVariantPointConfigs({
    variant_id,
  })

  res.json({
    point_config: configs[0] || {
      variant_id,
      payment_type: "currency",
      point_price: null,
    },
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest<PostAdminVariantPointConfigSchemaType>,
  res: MedusaResponse
) {
  const { id: variant_id } = req.params
  const { payment_type, point_price } = req.validatedBody

  const { result } = await updateVariantPointConfigWorkflow(req.scope).run({
    input: { variant_id, payment_type, point_price },
  })

  res.json({ point_config: result })
}
