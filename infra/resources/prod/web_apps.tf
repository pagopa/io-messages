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

  key_vault = module.key_vaults.com

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
    services_func       = "10.20.12.64/26"
    remote_content_func = "10.20.4.128/26"
  }

  nat_gateway_id = data.azurerm_nat_gateway.itn_ng.id

  app_settings = {
    message_error_table_storage_uri = "https://${module.storage_api_weu.com_st_name}.table.core.windows.net/"
    eventhub_connection_uri         = "${module.eventhubs.namespace.name}.servicebus.windows.net"
  }

  message_content_storage = {
    endpoint          = data.azurerm_storage_account.storage_api.primary_blob_endpoint
    connection_string = data.azurerm_storage_account.storage_api.primary_connection_string
  }

  redis_cache = {
    id         = azurerm_redis_cache.com.id
    hostname   = azurerm_redis_cache.com.hostname
    port       = azurerm_redis_cache.com.ssl_port
    access_key = azurerm_redis_cache.com.primary_access_key
  }

  application_insights = {
    connection_string   = data.azurerm_application_insights.common.connection_string
    instrumentation_key = data.azurerm_application_insights.common.instrumentation_key
    sampling_percentage = 5
  }

  common_key_vault = data.azurerm_key_vault.weu_common

  eventhub_namespace = module.eventhubs.namespace

  messages_content_container = data.azurerm_storage_container.messages_content_container
  messages_storage_account   = data.azurerm_storage_account.storage_api
  cosmosdb_account_api       = data.azurerm_cosmosdb_account.cosmos_api
  io_com_cosmos              = module.cosmos.io_com_cosmos_account
  com_st_id                  = module.storage_api_weu.com_st_id
  com_st_uri                 = "https://${module.storage_api_weu.com_st_name}.blob.core.windows.net/"
  com_st_queue_uri           = "https://${module.storage_api_weu.com_st_name}.queue.core.windows.net/"

  tenant_id = data.azurerm_client_config.current.tenant_id

  action_group_id        = module.monitoring.action_group.id
  com_st_connectiostring = module.storage_api_weu.com_st_connectiostring

  cqrs_func_ehns_enabled = true

  session_manager_base_url = "https://${data.azurerm_linux_function_app.session_manager_internal.default_hostname}"
}
