module "web_apps" {
  source = "../_modules/web_apps"

  resource_group_name                  = azurerm_resource_group.itn_messages.name
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
    notif_func = "10.20.8.0/26"
  }

  gcm_migration_storage = {
    id             = data.azurerm_storage_account.iopstexportdata.id,
    blob_endpoint  = data.azurerm_storage_account.iopstexportdata.primary_blob_endpoint
    queue_endpoint = data.azurerm_storage_account.iopstexportdata.primary_queue_endpoint
    queue          = azurerm_storage_queue.gcm_migrations
  }
}
