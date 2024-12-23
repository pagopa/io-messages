resource "azurerm_resource_group" "notifications" {
  name     = "${local.project_legacy}-rg-notifications"
  location = "westeurope"

  tags = local.tags
}

module "storage_api_weu" {
  source = "../_modules/storage_accounts"

  project        = local.project
  project_legacy = local.project_legacy
  location       = local.legacy_location
  location_short = local.legacy_location_short

  resource_group_name = data.azurerm_resource_group.internal_rg.name

  error_action_group_id = data.azurerm_monitor_action_group.io_com_action_group.id

  tags = local.tags
}

module "notification_hubs_weu" {
  source = "../_modules/notification_hubs"

  project                    = local.project_legacy
  legacy_resource_group_name = azurerm_resource_group.notifications.name
  resource_group_name        = data.azurerm_resource_group.weu_common.name
  location                   = azurerm_resource_group.notifications.location
  location_short             = "weu"

  key_vault_common_id = data.azurerm_key_vault.weu_common.id

  action_group_id = data.azurerm_monitor_action_group.io_com_action_group.id

  tags = local.tags
}
