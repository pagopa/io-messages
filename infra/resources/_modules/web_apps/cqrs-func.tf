data "azurerm_eventhub_authorization_rule" "cqrs_message_evh" {
  name                = "cqrs-func"
  namespace_name      = var.eventhub_namespace.name
  eventhub_name       = "cqrs-message-evh"
  resource_group_name = var.resource_group_name
}

data "azurerm_eventhub_authorization_rule" "cqrs_message_status_evh" {
  name                = "cqrs-func"
  namespace_name      = var.eventhub_namespace.name
  eventhub_name       = "cqrs-message-status-evh"
  resource_group_name = var.resource_group_name
}

locals {
  cqrs_func = {
    app_settings = {
      NODE_ENV = "production"

      COSMOSDB_NAME             = "db"
      COSMOSDB__accountEndpoint = var.cosmosdb_account_api.endpoint

      MESSAGE_PAYMENT_UPDATER_FAILURE_QUEUE_NAME = "message-paymentupdater-failures"

      MESSAGE_CONTENT_STORAGE_CONNECTION = var.message_content_storage.connection_string
      QueueStorageConnection             = var.message_content_storage.connection_string

      MESSAGE_CHANGE_FEED_LEASE_PREFIX = "CosmosApiMessageChangeFeed-00"
      MESSAGE_CHANGE_FEED_START_TIME   = 1688169600000 # Saturday 1 July 2023 00:00:00

      MESSAGES_TOPIC_CONNECTION_STRING                             = data.azurerm_eventhub_authorization_rule.cqrs_message_evh.primary_connection_string
      MESSAGE_STATUS_FOR_REMINDER_TOPIC_PRODUCER_CONNECTION_STRING = data.azurerm_eventhub_authorization_rule.cqrs_message_status_evh.primary_connection_string

      KAFKA_SSL_ACTIVE = true

      PN_SERVICE_ID = "01G40DWQGKY5GRWSNM4303VNRP"

      # Keepalive fields are all optionals
      FETCH_KEEPALIVE_ENABLED             = "true"
      FETCH_KEEPALIVE_SOCKET_ACTIVE_TTL   = "110000"
      FETCH_KEEPALIVE_MAX_SOCKETS         = "40"
      FETCH_KEEPALIVE_MAX_FREE_SOCKETS    = "10"
      FETCH_KEEPALIVE_FREE_SOCKET_TIMEOUT = "30000"
      FETCH_KEEPALIVE_TIMEOUT             = "60000"

      COM_STORAGE_CONNECTION_STRING = var.com_st_connectiostring
    }
  }
}

module "cqrs_func" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 1.0"

  environment = merge(var.environment, {
    app_name        = "cqrs"
    instance_number = "01"
  })

  resource_group_name = var.resource_group_name
  health_check_path   = "/api/v1/info"
  node_version        = 20

  tier = "xl"

  subnet_cidr                          = var.subnet_cidrs.cqrs_func
  subnet_pep_id                        = var.subnet_pep_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  app_settings = local.cqrs_func.app_settings

  slot_app_settings = merge(
    local.cqrs_func.app_settings, {
      // disable listeners on staging slot
      "AzureWebJobs.CosmosApiMessageStatusChangeFeedForReminder.Disabled"       = "1"
      "AzureWebJobs.CosmosApiMessagesChangeFeed.Disabled"                       = "1"
      "AzureWebJobs.HandleMessageChangeFeedPublishFailures.Disabled"            = "1"
      "AzureWebJobs.CosmosRemoteContentMessageConfigurationChangeFeed.Disabled" = "1"
    }
  )

  tags = var.tags

  application_insights_connection_string   = var.application_insights.connection_string
  application_insights_sampling_percentage = 5

  action_group_id = var.action_group_id
}

module "cqrs_func_autoscaler" {
  source  = "pagopa-dx/azure-app-service-plan-autoscaler/azurerm"
  version = "~> 1.0"

  resource_group_name = module.cqrs_func.function_app.resource_group_name
  location            = var.environment.location

  app_service_plan_id = module.cqrs_func.function_app.plan.id

  target_service = {
    function_app = {
      id = module.cqrs_func.function_app.function_app.id
    }
  }

  scale_metrics = {
    cpu = {
      time_aggregation_increase = "Maximum"
      time_aggregation_decrease = "Average"
      increase_by               = 3
      cooldown_increase         = 2
      decrease_by               = 1
      cooldown_decrease         = 1
      upper_threshold           = 40
      lower_threshold           = 15
    },
    requests = {
      time_aggregation_increase = "Maximum"
      time_aggregation_decrease = "Average"
      increase_by               = 3
      cooldown_increase         = 1
      decrease_by               = 1
      cooldown_decrease         = 1
      upper_threshold           = 3000
      lower_threshold           = 300
    }
  }

  scheduler = {
    normal_load = {
      default = 3,
      minimum = 2,

    },
    maximum = 30,
  }

  tags = var.tags
}

resource "azurerm_cosmosdb_sql_role_assignment" "cosmos_api_cqrs_func" {
  resource_group_name = var.cosmosdb_account_api.resource_group_name
  account_name        = var.cosmosdb_account_api.name
  role_definition_id  = "${var.cosmosdb_account_api.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = module.cqrs_func.function_app.function_app.principal_id
  scope               = var.cosmosdb_account_api.id
}
