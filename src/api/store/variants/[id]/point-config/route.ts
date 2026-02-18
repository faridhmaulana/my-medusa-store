import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POINT_BALANCE_MODULE } from "../../../../../modules/pointBalance"
import PointBalanceModuleService from "../../../../../modules/pointBalance/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
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
