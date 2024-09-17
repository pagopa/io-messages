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
