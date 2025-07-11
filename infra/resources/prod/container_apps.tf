module "container_apps" {
  source = "../_modules/container_apps"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.itn_com.name

  virtual_network                      = data.azurerm_virtual_network.vnet_common_itn
  subnet_cidr                          = "10.20.8.128/25"
  subnet_pep_id                        = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = data.azurerm_resource_group.weu_common.name

  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.common.id

  key_vault_id = module.key_vaults.com.id

  application_insights = data.azurerm_application_insights.common

  tenant_id = data.azurerm_client_config.current.tenant_id

  entra_id_admin_ids = [
    data.azuread_group.adgroup_com_admins.object_id,
    data.azuread_group.adgroup_com_devs.object_id,
    data.azuread_group.adgroup_io_admins.object_id,
  ]

  dns_forwarding_ruleset_id = azurerm_private_dns_resolver_dns_forwarding_ruleset.com.id

  tags = local.tags
}
