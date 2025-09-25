data "azurerm_key_vault_secret" "ntfns_prod_token" {
  name         = "notification-hub-ntfns-common-ntf-common-token"
  key_vault_id = var.key_vault.id
}

data "azurerm_key_vault_secret" "ntfns_test_token" {
  name         = "notification-hub-ntfns-common-ntf-common-token-sandbox"
  key_vault_id = var.key_vault.id
}

data "azurerm_key_vault_secret" "ntfns_prod_api_key" {
  name         = "notification-hub-ntfns-common-ntf-common-api-key"
  key_vault_id = var.key_vault.id
}

data "azurerm_key_vault_secret" "ntfns_test_api_key" {
  name         = "notification-hub-ntfns-common-ntf-common-api-key-sandbox"
  key_vault_id = var.key_vault.id
}
