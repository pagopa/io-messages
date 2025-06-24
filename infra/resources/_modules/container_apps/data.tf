data "azurerm_key_vault_secret" "pagopa_proxy_subscription_key" {
  name         = "pagopa-proxy-subscription-key"
  key_vault_id = var.key_vault_id
}
