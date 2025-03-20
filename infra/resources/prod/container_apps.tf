module "container_apps" {
  source = "../_modules/container_apps"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.itn_com.name

  virtual_network                      = data.azurerm_virtual_network.vnet_common_itn
  subnet_cidr                          = "10.20.8.128/25"
  subnet_pep_id                        = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = data.azurerm_resource_group.weu_common.name

  log_analytics_workspace_id = data.azurerm_application_insights.common.workspace_id

  tags = local.tags
}
