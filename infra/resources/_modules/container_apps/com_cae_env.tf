module "com_cae_env" {
  source  = "pagopa-dx/azure-container-app-environment/azurerm"
  version = "~> 2.0"

  resource_group_name = var.resource_group_name

  networking = {
    virtual_network_id                   = var.virtual_network.id
    private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name
  }

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    app_name        = var.environment.domain
    instance_number = "02"
  }

  log_analytics_workspace_id = var.log_analytics_workspace_id

  tags = var.tags
}

resource "azurerm_role_assignment" "key_vault_com_cae_env_secrets_user" {
  scope                = var.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.com_cae_env.principal_id
}
