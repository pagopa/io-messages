locals {
  remote_content = {
    app_settings = {
      NODE_ENV = "production"

      // IO COSMOSDB
      COSMOSDB_NAME = "db"
      COSMOSDB_URI  = var.cosmosdb_account_api.endpoint

      // REMOTE CONTENT COSMOSDB
      REMOTE_CONTENT_COSMOSDB_NAME = "remote-content-cosmos-01"
      REMOTE_CONTENT_COSMOSDB_URI  = var.io_com_cosmos.endpoint

      // BLOB STORAGE
      MESSAGE_CONTENT_STORAGE_CONNECTION_STRING = var.message_content_storage.connection_string
      MESSAGE_CONTAINER_NAME                    = "message-content"

      // QUEUE STORAGE
      NOTIFICATION_QUEUE_STORAGE_CONNECTION_STRING = var.com_st_connectiostring
      NOTIFICATION_QUEUE_NAME                      = "push-notifications"

      // REDIS
      REDIS_URL      = var.redis_cache.hostname
      REDIS_PORT     = var.redis_cache.port
      REDIS_PASSWORD = var.redis_cache.access_key

      SESSION_MANAGER_API_KEY  = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=session-manager-api-key)",
      SESSION_MANAGER_BASE_URL = var.session_manager_base_url,

      // INTERNAL USE PROPERTIES
      INTERNAL_USER_ID           = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=apim-internal-user-id)",
      RC_CONFIGURATION_CACHE_TTL = "28800"

      // Keepalive fields are all optionals
      FETCH_KEEPALIVE_ENABLED             = "true"
      FETCH_KEEPALIVE_SOCKET_ACTIVE_TTL   = "110000"
      FETCH_KEEPALIVE_MAX_SOCKETS         = "40"
      FETCH_KEEPALIVE_MAX_FREE_SOCKETS    = "10"
      FETCH_KEEPALIVE_FREE_SOCKET_TIMEOUT = "30000"
      FETCH_KEEPALIVE_TIMEOUT             = "60000"
    }
  }
}


data "azurerm_nat_gateway" "nat_gateway" {
  name                = "io-p-itn-ng-01"
  resource_group_name = "io-p-itn-common-rg-01"
}

module "remote_content_func" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 0.0"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = "rc"
    instance_number = "01"
  }

  tier = "xl"

  resource_group_name = var.resource_group_name
  health_check_path   = "/api/v1/info"
  node_version        = 20

  subnet_cidr                          = var.subnet_cidrs.remote_content_func
  subnet_pep_id                        = var.subnet_pep_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  subnet_service_endpoints = {
    web = true
  }

  app_settings      = local.remote_content.app_settings
  slot_app_settings = local.remote_content.app_settings

  application_insights_connection_string   = var.application_insights.connection_string
  application_insights_sampling_percentage = var.application_insights.sampling_percentage

  tags = var.tags

  action_group_id = var.action_group_id
}

resource "azurerm_subnet_nat_gateway_association" "net_gateway_association_subnet" {
  nat_gateway_id = data.azurerm_nat_gateway.nat_gateway.id
  subnet_id      = module.remote_content_func.subnet.id
}

resource "azurerm_role_assignment" "remote_content_key_vault_secrets_user" {
  scope                = var.key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.remote_content_func.function_app.function_app.principal_id
}

resource "azurerm_role_assignment" "remote_content_slot_key_vault_secrets_user" {
  scope                = var.key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.remote_content_func.function_app.function_app.slot.principal_id
}

resource "azurerm_role_assignment" "remote_content_cosmosdb_account_api" {
  for_each = toset([
    module.remote_content_func.function_app.function_app.principal_id,
    module.remote_content_func.function_app.function_app.slot.principal_id
  ])
  scope                = var.cosmosdb_account_api.id
  role_definition_name = "SQL DB Contributor"
  principal_id         = each.value
}

resource "azurerm_cosmosdb_sql_role_assignment" "cosmosdb_account_api" {
  for_each = toset([
    module.remote_content_func.function_app.function_app.principal_id,
    module.remote_content_func.function_app.function_app.slot.principal_id
  ])
  resource_group_name = var.cosmosdb_account_api.resource_group_name
  account_name        = var.cosmosdb_account_api.name
  scope               = var.cosmosdb_account_api.id
  role_definition_id  = "${var.cosmosdb_account_api.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = each.value
}

resource "azurerm_role_assignment" "remote_content_io_com_cosmos" {
  for_each = toset([
    module.remote_content_func.function_app.function_app.principal_id,
    module.remote_content_func.function_app.function_app.slot.principal_id
  ])
  scope                = var.io_com_cosmos.id
  role_definition_name = "SQL DB Contributor"
  principal_id         = each.value
}

resource "azurerm_cosmosdb_sql_role_assignment" "io_com_cosmos" {
  for_each = toset([
    module.remote_content_func.function_app.function_app.principal_id,
    module.remote_content_func.function_app.function_app.slot.principal_id
  ])
  resource_group_name = var.io_com_cosmos.resource_group_name
  account_name        = var.io_com_cosmos.name
  scope               = var.io_com_cosmos.id
  role_definition_id  = "${var.io_com_cosmos.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = each.value
}


output "remote_content_func" {
  value = {
    id                   = module.remote_content_func.function_app.function_app.id
    name                 = module.remote_content_func.function_app.function_app.name
    resource_group_name  = module.remote_content_func.function_app.resource_group_name
    principal_id         = module.remote_content_func.function_app.function_app.principal_id
    staging_principal_id = module.remote_content_func.function_app.function_app.slot.principal_id
  }
}

