locals {
  send_func = {
    app_settings = {
      NODE_ENV                 = "production",
      FUNCTIONS_WORKER_RUNTIME = "node",
    }
  }
}

module "send_func" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 1.0"

  environment = merge(var.environment, {
    app_name        = "send",
    instance_number = "01"
  })

  application_insights_connection_string   = var.application_insights.connection_string
  application_insights_sampling_percentage = var.application_insights.sampling_percentage

  tier = "m"

  resource_group_name                  = var.resource_group_name
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  health_check_path = "/api/health"

  app_settings      = local.send_func.app_settings
  slot_app_settings = local.send_func.app_settings

  sticky_app_setting_names = ["NODE_ENV"]

  virtual_network = var.virtual_network

  subnet_cidr   = var.subnet_cidrs.send_func
  subnet_pep_id = var.subnet_pep_id

  tags = var.tags

  action_group_id = var.action_group_id
}

resource "azurerm_role_assignment" "key_vault_send_func_secrets_user" {
  scope                = var.common_key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.send_func.function_app.function_app.principal_id
}

resource "azurerm_key_vault_access_policy" "send_func_kv_access_policy" {
  key_vault_id = var.common_key_vault.id
  tenant_id    = var.tenant_id
  object_id    = module.send_func.function_app.function_app.principal_id

  secret_permissions      = ["Get", "List"]
  storage_permissions     = []
  certificate_permissions = []
}
