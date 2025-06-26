locals {
  project     = "${var.prefix}-${var.env_short}-${var.location_short}-${var.domain}"
  product     = "${var.prefix}-${var.env_short}"
  project_itn = "${var.prefix}-${var.env_short}-itn"

  apim_itn_name                = "${local.product}-itn-apim-01"
  apim_itn_resource_group_name = "${local.product}-itn-common-rg-01"

  key_vault = var.key_vault
}
