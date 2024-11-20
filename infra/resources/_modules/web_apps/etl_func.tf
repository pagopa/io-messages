module "etl_func" {
  source = "github.com/pagopa/dx//infra/modules/azure_function_app?ref=b7a84bd876d31797ac87daf9cefebd8f6a579c08"

  environment = merge(var.environment, {
    app_name        = "etl",
    instance_number = "01"
  })

  application_insights_connection_string   = var.application_insights.connection_string
  application_insights_sampling_percentage = 5

  tier = "m"

  resource_group_name                  = var.resource_group_name
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  health_check_path = "/api/health"

  app_settings = {
    NODE_ENV                       = "production",
    FUNCTIONS_WORKER_RUNTIME       = "node",
    MESSAGE_CONTENT_STORAGE_URI    = var.app_settings.message_content_storage_uri
    EVENTHUB_CONNECTION_URI        = var.app_settings.eventhub_connection_uri,
    MESSAGE_CONTENT_CONTAINER_NAME = "message-content",
    MESSAGE_EVENTHUB_NAME          = "io-p-itn-com-etl-messages-evh-01"
    PDV_TOKENIZER_API_KEY          = "@Microsoft.KeyVault(VaultName=${var.common_key_vault.name};SecretName=func-elt-PDV-TOKENIZER-API-KEY)"
  }

  sticky_app_setting_names = ["NODE_ENVIRONMENT"]

  virtual_network = var.virtual_network

  subnet_cidr   = var.subnet_cidrs.notif_func
  subnet_pep_id = var.subnet_pep_id

  tags = var.tags

  action_group_id = var.action_group_id
}

resource "azurerm_role_assignment" "key_vault_etl_func_secrets_user" {
  scope                = var.common_key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.etl_func.function_app.function_app.principal_id
}

resource "azurerm_role_assignment" "cosmos_api_read" {
  scope                = var.cosmos_api.id
  role_definition_name = "Cosmos DB Account Reader Role"
  principal_id         = module.etl_func.function_app.function_app.principal_id
}

resource "azurerm_role_assignment" "eventhub_namespace_write" {
  scope                = var.eventhub_namespace.id
  role_definition_name = "Azure Event Hubs Data Sender"
  principal_id         = module.etl_func.function_app.function_app.principal_id
}

resource "azurerm_role_assignment" "message_content_container_read" {
  scope                = var.message_content_container.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = module.etl_func.function_app.function_app.principal_id
}


output "etl_func" {
  value = {
    id                   = module.etl_func.function_app.function_app.id
    name                 = module.etl_func.function_app.function_app.name
    resource_group_name  = module.etl_func.function_app.resource_group_name
    principal_id         = module.etl_func.function_app.function_app.principal_id
    staging_principal_id = module.etl_func.function_app.function_app.slot.principal_id
  }
}
