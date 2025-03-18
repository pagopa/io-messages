module "com_cae" {
  source  = "pagopa-dx/azure-container-app-environment/azurerm"
  version = "~> 0.0"

  resource_group_name = var.resource_group_name

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    app_name        = var.environment.domain
    instance_number = "01"
  }

  virtual_network                      = var.virtual_network
  subnet_cidr                          = var.subnet_cidr
  subnet_pep_id                        = var.subnet_pep_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  log_analytics_workspace_id = var.log_analytics_workspace_id

  tags = var.tags
}
