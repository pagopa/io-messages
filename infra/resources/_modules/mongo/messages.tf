module "reminder_cosmos_account" {
  source = "github.com/pagopa/terraform-azurerm-v4//cosmosdb_account?ref=v7.13.0"

  name                = "${local.project_legacy}-messages-reminder-mongodb-account"
  domain              = "messages"
  location            = "westeurope"
  resource_group_name = var.resource_group_name

  offer_type       = "Standard"
  enable_free_tier = false

  kind                 = "MongoDB"
  capabilities         = ["EnableMongo"]
  mongo_server_version = "4.0"

  public_network_access_enabled     = false
  private_endpoint_enabled          = false
  is_virtual_network_filter_enabled = false

  main_geo_location_location       = var.environment.location
  main_geo_location_zone_redundant = false
  additional_geo_locations = [{
    location          = var.secondary_geo_location
    failover_priority = 1
    zone_redundant    = false
  }]

  consistency_policy = {
    consistency_level       = "Session"
    max_interval_in_seconds = null
    max_staleness_prefix    = null
  }

  tags = var.tags
}

locals {
  reminder_cosmos_account_pep_name = provider::dx::resource_name(merge(var.environment,
    {
      name            = "reminder",
      resource_type   = "cosmos_private_endpoint",
      instance_number = 1
    })
  )
}

resource "azurerm_private_endpoint" "reminder_cosmos_account" {
  name                = local.reminder_cosmos_account_pep_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = local.reminder_cosmos_account_pep_name
    private_connection_resource_id = module.reminder_cosmos_account.id
    is_manual_connection           = false
    subresource_names              = ["MongoDB"]
  }
}

resource "azurerm_cosmosdb_mongo_database" "db_reminder" {
  name                = "db"
  resource_group_name = var.resource_group_name
  account_name        = module.reminder_cosmos_account.name

  autoscale_settings {
    max_throughput = 4000
  }
}

module "mongdb_collection_reminder_sharded" {
  source = "github.com/pagopa/terraform-azurerm-v4//cosmosdb_mongodb_collection?ref=v7.13.0"

  name                = "reminder-sharded-new"
  resource_group_name = var.resource_group_name

  cosmosdb_mongo_account_name  = module.reminder_cosmos_account.name
  cosmosdb_mongo_database_name = azurerm_cosmosdb_mongo_database.db_reminder.name

  shard_key = "shard"

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
      keys   = ["shard"]
      unique = false
    },
    {
      keys   = ["readFlag"]
      unique = false
    },
    {
      keys   = ["paidFlag"]
      unique = false
    },
    {
      keys   = ["content_type"]
      unique = false
    },
    {
      keys   = ["maxReadMessageSend"]
      unique = false
    },
    {
      keys   = ["maxPaidMessageSend"]
      unique = false
    },
    {
      keys   = ["lastDateReminder"]
      unique = false
    },
    {
      keys   = ["dueDate"]
      unique = false
    },
    {
      keys   = ["insertionDate"]
      unique = false
    },
    {
      keys   = ["content_paymentData_noticeNumber", "content_paymentData_payeeFiscalCode"]
      unique = false
    },
    {
      keys   = ["content_paymentData_dueDate"]
      unique = false
    },
  ]
}

#tfsec:ignore:AZU023
resource "azurerm_key_vault_secret" "mongodb_reminder_connection_string" {
  name         = "reminder-mongo-connection-string"
  value        = module.reminder_cosmos_account.primary_connection_strings
  key_vault_id = var.key_vault_id
}
