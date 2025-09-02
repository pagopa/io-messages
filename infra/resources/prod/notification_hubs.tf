//we need to create a new resource group for the notification hub ?

module "notification_hubs_itn" {
  source = "../_modules/notification_hubs_itn"

  project             = local.project_legacy
  resource_group_name = azurerm_resource_group.itn_com.name
  location            = azurerm_resource_group.itn_com.location
  location_short      = local.location_short
  # resource_group_name_itn = azurerm_resource_group.itn_com.name

  key_vault_common_id = module.key_vaults.com.id

  action_group_id = module.monitoring.action_group.id

  adgroup_com_devs_id = data.azuread_group.adgroup_com_devs.object_id

  tags = local.tags
}
