data "azurerm_key_vault_secret" "ntfns_common_ntf_common_token" {
  name         = "notification-hub-ntfns-common-ntf-common-token"
  key_vault_id = var.key_vault_common_id
}

data "azurerm_key_vault_secret" "ntfns_common_ntf_common_token_sandbox" {
  name         = "notification-hub-ntfns-common-ntf-common-token-sandbox"
  key_vault_id = var.key_vault_common_id
}

data "azurerm_key_vault_secret" "ntfns_common_ntf_common_api_key" {
  name         = "notification-hub-ntfns-common-ntf-common-api-key"
  key_vault_id = var.key_vault_common_id
}

data "azurerm_key_vault_secret" "ntfns_common_ntf_common_api_key_sandbox" {
  name         = "notification-hub-ntfns-common-ntf-common-api-key-sandbox"
  key_vault_id = var.key_vault_common_id
}

