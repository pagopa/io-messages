module "cosmosdb_account_mongodb_payments" {
  source = "git::https://github.com/pagopa/terraform-azurerm-v4.git//cosmosdb_account?ref=v7.13.0"

  name                 = "${var.project_legacy}-payments-mongodb-account"
  location             = local.location
  resource_group_name  = var.resource_group_name
  offer_type           = "Standard"
  enable_free_tier     = false
  kind                 = "MongoDB"
  capabilities         = ["EnableMongo"]
  mongo_server_version = "4.0"
  domain               = "PAYMENTS"

  public_network_access_enabled     = false
  private_endpoint_enabled          = true
  subnet_id                         = data.azurerm_subnet.private_endpoints_subnet.id
  private_dns_zone_mongo_ids        = [data.azurerm_private_dns_zone.privatelink_mongo_cosmos_azure_com.id]
  is_virtual_network_filter_enabled = false

  main_geo_location_location       = local.location
  main_geo_location_zone_redundant = false
  additional_geo_locations = [{
    location          = "italynorth"
    failover_priority = 1
    zone_redundant    = true
  }]
  consistency_policy = {
    consistency_level       = "Session"
    max_interval_in_seconds = null
    max_staleness_prefix    = null
  }

  tags = var.tags
}

resource "azurerm_cosmosdb_mongo_database" "db_payments" {
  name                = "db"
  resource_group_name = var.resource_group_name
  account_name        = module.cosmosdb_account_mongodb_payments.name

  autoscale_settings {
    max_throughput = 2000
  }
}

module "mongdb_collection_payment_sharded" {
  source = "git::https://github.com/pagopa/terraform-azurerm-v4.git//cosmosdb_mongodb_collection?ref=v7.13.0"

  name                = "payment-sharded"
  resource_group_name = var.resource_group_name

  cosmosdb_mongo_account_name  = module.cosmosdb_account_mongodb_payments.name
  cosmosdb_mongo_database_name = azurerm_cosmosdb_mongo_database.db_payments.name

  shard_key = "rptId"

  indexes = [
    {
      keys   = ["_id"]
      unique = true
    },
    {
      keys   = ["rptId"]
      unique = false
    },
    {
      keys   = ["content_paymentData_payeeFiscalCode", "content_paymentData_noticeNumber"]
      unique = false
    },
  ]
}

module "mongdb_collection_payment_retry" {
  source = "git::https://github.com/pagopa/terraform-azurerm-v4.git//cosmosdb_mongodb_collection?ref=v7.13.0"

  name                = "payment-retry"
  resource_group_name = var.resource_group_name

  cosmosdb_mongo_account_name  = module.cosmosdb_account_mongodb_payments.name
  cosmosdb_mongo_database_name = azurerm_cosmosdb_mongo_database.db_payments.name

  indexes = [
    {
      keys   = ["_id"]
      unique = true
    },
    {
      keys   = ["rptId"]
      unique = false
    },
    {
      keys   = ["payeeFiscalCode", "noticeNumber"]
      unique = false
    },
  ]

  lock_enable = true
}

#tfsec:ignore:AZU023
resource "azurerm_key_vault_secret" "mongodb_payments_connection_string" {
  name         = "paymentup-mongo-connection-string"
  value        = module.cosmosdb_account_mongodb_payments.primary_connection_strings
  key_vault_id = var.key_vault_id
}
