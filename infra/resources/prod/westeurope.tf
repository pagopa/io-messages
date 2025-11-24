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

  environment = {
    env_short = local.env_short
    location  = local.location
    prefix    = local.prefix
  }

  subnet_pep_id = data.azurerm_subnet.pep.id

  legacy_resource_group_name = data.azurerm_resource_group.internal_rg.name
  resource_group_name        = azurerm_resource_group.itn_com.name

  error_action_group_id = module.monitoring.action_group.id

  tags = local.tags
}
