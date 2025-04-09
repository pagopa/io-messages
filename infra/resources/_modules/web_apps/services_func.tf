locals {
  service_func = {
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
      NOTIFICATION_QUEUE_STORAGE_CONNECTION_STRING = var.notification_storage_account_queue_connection_string
      NOTIFICATION_QUEUE_NAME                      = "push-notifications"

      // REDIS
      REDIS_URL      = var.redis_cache.hostname
      REDIS_PORT     = var.redis_cache.port
      REDIS_PASSWORD = var.redis_cache.access_key

      // BACKEND COMMUNICATION
      BACKEND_BASE_URL = "https://io-p-app-appbackendli.azurewebsites.net"
      BACKEND_TOKEN    = var.appbackendli_token

      // INTERNAL USE PROPERTIES
      INTERNAL_USER_ID           = var.internal_user_id
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

module "service_func" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 0.0"

  environment = merge(var.environment, {
    app_name        = "service"
    instance_number = "01"
  })

  resource_group_name = var.resource_group_name
  health_check_path   = "/api/v1/info"
  node_version        = 20

  tier = "xl"

  subnet_cidr                          = var.subnet_cidrs.service_func
  subnet_pep_id                        = var.subnet_pep_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  subnet_service_endpoints = {
    web = true
  }

  app_settings      = local.service_func.app_settings
  slot_app_settings = local.service_func.app_settings

  tags = var.tags

  application_insights_connection_string   = var.application_insights.connection_string
  application_insights_sampling_percentage = 5

  action_group_id = var.action_group_id
}

resource "azurerm_subnet_nat_gateway_association" "service_func" {
  subnet_id      = module.service_func.subnet.id
  nat_gateway_id = var.nat_gateway_id
}

resource "azurerm_role_assignment" "service_func_cosmosdb_account_api" {
  for_each = toset([
    module.service_func.function_app.function_app.principal_id,
    module.service_func.function_app.function_app.slot.principal_id
  ])
  scope                = var.cosmosdb_account_api.id
  role_definition_name = "SQL DB Contributor"
  principal_id         = each.value
}

resource "azurerm_cosmosdb_sql_role_assignment" "service_func_api" {
  for_each = toset([
    module.service_func.function_app.function_app.principal_id,
    module.service_func.function_app.function_app.slot.principal_id
  ])
  resource_group_name = var.cosmosdb_account_api.resource_group_name
  account_name        = var.cosmosdb_account_api.name
  scope               = var.cosmosdb_account_api.id
  role_definition_id  = "${var.cosmosdb_account_api.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = each.value
}

resource "azurerm_role_assignment" "service_func_io_com_cosmos" {
  for_each = toset([
    module.service_func.function_app.function_app.principal_id,
    module.service_func.function_app.function_app.slot.principal_id
  ])
  scope                = var.io_com_cosmos.id
  role_definition_name = "SQL DB Contributor"
  principal_id         = each.value
}

resource "azurerm_cosmosdb_sql_role_assignment" "service_func_com" {
  for_each = toset([
    module.service_func.function_app.function_app.principal_id,
    module.service_func.function_app.function_app.slot.principal_id
  ])
  resource_group_name = var.io_com_cosmos.resource_group_name
  account_name        = var.io_com_cosmos.name
  scope               = var.io_com_cosmos.id
  role_definition_id  = "${var.io_com_cosmos.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = each.value
}
