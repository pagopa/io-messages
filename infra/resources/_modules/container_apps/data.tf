data "azurerm_key_vault_secret" "pagopa_ecommerce_key" {
  name         = "pagopa-ecommerce-prod-subscription-key"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "pagopa_ecommerce_key" {
  name         = "pagopa-ecommerce-prod-subscription-key"
  key_vault_id = var.key_vault_id
}
