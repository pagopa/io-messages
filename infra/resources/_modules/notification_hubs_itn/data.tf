data "azurerm_key_vault_secret" "notification_hub_prod_token" {
  name         = "notification-hub-prod-token"
  key_vault_id = var.key_vault_common_id
}

data "azurerm_key_vault_secret" "notification_hub_dev_token" {
  name         = "notification-hub-dev-token"
  key_vault_id = var.key_vault_common_id
}

data "azurerm_key_vault_secret" "notification_hub_prod_api_key" {
  name         = "notification-hub-prod-api-key"
  key_vault_id = var.key_vault_common_id
}

data "azurerm_key_vault_secret" "notification_hub_dev_api_key" {
  name         = "notification-hub-dev-api-key"
  key_vault_id = var.key_vault_common_id
}

