module "web_apps" {
  source = "../_modules/web_apps"

  resource_group_name                  = azurerm_resource_group.itn_com.name
  private_dns_zone_resource_group_name = data.azurerm_resource_group.weu_common.name

  environment = {
    prefix    = local.prefix
    env_short = local.env_short
    location  = local.location
    domain    = local.domain
  }

  tags = local.tags

  # networking

  virtual_network = {
    resource_group_name = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
    name                = data.azurerm_virtual_network.vnet_common_itn.name
  }

  subnet_pep_id = data.azurerm_subnet.pep.id

  subnet_cidrs = {
    etl_func            = "10.20.8.0/26"
    citizen_func        = "10.20.8.64/26"
    ops_func            = "10.20.10.0/26"
    push_notif_func     = "10.20.10.64/26"
    cqrs_func           = "10.20.10.128/26"
    remote_content_func = "10.20.1.0/24"
  }

  nat_gateway_id = data.azurerm_nat_gateway.itn_ng.id

  app_settings = {
    message_error_table_storage_uri = data.azurerm_storage_account.storage_api_com.primary_table_endpoint
    eventhub_connection_uri         = "${module.eventhubs.namespace.name}.servicebus.windows.net"
  }

  message_content_storage = {
    endpoint          = data.azurerm_storage_account.storage_api.primary_blob_endpoint
    connection_string = data.azurerm_storage_account.storage_api.primary_connection_string
  }

  redis_cache = {
    id         = data.azurerm_redis_cache.com.id
    hostname   = data.azurerm_redis_cache.com.hostname
    port       = data.azurerm_redis_cache.com.ssl_port
    access_key = data.azurerm_redis_cache.com.primary_access_key
  }

  application_insights = {
    connection_string   = data.azurerm_application_insights.common.connection_string
    instrumentation_key = data.azurerm_application_insights.common.instrumentation_key
    sampling_percentage = 5
  }

  common_key_vault = data.azurerm_key_vault.weu_common

  eventhub_namespace         = module.eventhubs.namespace
  messages_content_container = data.azurerm_storage_container.messages_content_container
  messages_storage_account   = data.azurerm_storage_account.storage_api
  cosmosdb_account_api       = data.azurerm_cosmosdb_account.cosmos_api
  io_com_cosmos              = data.azurerm_cosmosdb_account.io_com_cosmos
  com_st_id                  = module.storage_api_weu.com_st_id
  com_st_uri                 = data.azurerm_storage_account.storage_api_com.primary_blob_endpoint
  com_st_queue_uri           = data.azurerm_storage_account.storage_api_com.primary_queue_endpoint

  tenant_id = data.azurerm_client_config.current.tenant_id

  action_group_id        = module.monitoring.action_group.io_com_error_id
  com_st_connectiostring = module.storage_api_weu.com_st_connectiostring

  cqrs_func_ehns_enabled = true

  appbackendli_token = data.azurerm_key_vault_secret.appbackendli_token.value

  internal_user_id = data.azurerm_key_vault_secret.internal_user.value
}
