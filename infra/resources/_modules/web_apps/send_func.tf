locals {
  send_func = {
    app_settings = {
      NODE_ENV                         = "production",
      FUNCTIONS_WORKER_RUNTIME         = "node",
      NOTIFICATION_CLIENT_API_KEY      = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=send-aar-notification-prod-key)",
      NOTIFICATION_CLIENT_BASE_URL     = "https://api-io.pn.pagopa.it",
      NOTIFICATION_CLIENT_UAT_API_KEY  = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=send-aar-notification-uat-key)",
      NOTIFICATION_CLIENT_UAT_BASE_URL = "https://api-io.uat.notifichedigitali.it",
      LOLLIPOP_API_BASE_URL            = "https://io-p-itn-auth-lollipop-func-02.azurewebsites.net/api/v1",
      LOLLIPOP_FUNC_KEY                = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=lollipop-func-key)"
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

  health_check_path = "/api/v1/send/health"

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
  scope                = var.key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.send_func.function_app.function_app.principal_id
}

resource "azurerm_key_vault_access_policy" "send_func_kv_access_policy" {
  key_vault_id = var.key_vault.id
  tenant_id    = var.tenant_id
  object_id    = module.send_func.function_app.function_app.principal_id

  secret_permissions      = ["Get", "List"]
  storage_permissions     = []
  certificate_permissions = []
}


resource "azurerm_monitor_metric_alert" "send_func_5xx_http_server_errors" {
  name                = "${module.send_func.function_app.function_app.name}-http-5xx-server-errors"
  resource_group_name = var.resource_group_name
  scopes              = [module.send_func.function_app.function_app.principal_id]
  description         = "${module.send_func.function_app.function_app.name} http 5xx server errors"
  severity            = 1
  window_size         = "PT5M"
  frequency           = "PT1M"
  auto_mitigate       = false

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "Http5xx"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 10
  }

  action {
    action_group_id = var.action_group_id
  }
}

resource "azurerm_monitor_metric_alert" "send_func_4xx_http_server_errors" {
  name                = "${module.send_func.function_app.function_app.name}-http-4xx-server-errors"
  resource_group_name = var.resource_group_name
  scopes              = [module.send_func.function_app.function_app.principal_id]
  description         = "${module.send_func.function_app.function_app.name} http 4xx server errors"
  severity            = 1
  window_size         = "PT5M"
  frequency           = "PT1M"
  auto_mitigate       = false

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "Http4xx"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 10
  }

  action {
    action_group_id = var.action_group_id
  }
}
