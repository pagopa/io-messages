data "azurerm_key_vault_secret" "ntfns_prod_token" {
  name         = "notification-hub-prod-token"
  key_vault_id = var.key_vault.id
}

data "azurerm_key_vault_secret" "ntfns_test_token" {
  name         = "notification-hub-dev-token"
  key_vault_id = var.key_vault.id
}

data "azurerm_key_vault_secret" "ntfns_prod_api_key" {
  name         = "notification-hub-prod-api-key"
  key_vault_id = var.key_vault.id
}

data "azurerm_key_vault_secret" "ntfns_test_api_key" {
  name         = "notification-hub-dev-api-key"
  key_vault_id = var.key_vault.id
}
