data "azurerm_key_vault_secret" "pagopa_ecommerce_key" {
  name         = "pagopa-ecommerce-prod-subscription-key"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "pagopa_ecommerce_uat_key" {
  name         = "pagopa-ecommerce-uat-subscription-key"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "pagopa_proxy_subscription_key" {
  name         = "pagopa-proxy-subscription-key"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "lollipop_api_key" {
  name         = "lollipop-func-key"
  key_vault_id = var.key_vault_id
}

data "azuread_application" "entra_auth_app" {
  display_name = "io-managed-identity-auth-app"
}

data "azuread_service_principal" "apim" {
  display_name = "io-p-itn-platform-api-gateway-apim-01"
}
