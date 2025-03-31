data "azurerm_eventhub_authorization_rule" "evh_ns_io_auth_messages" {
  name                = "${var.environment.prefix}-messages"
  namespace_name      = "${var.environment.prefix}-${var.environment.env_short}-evh-ns"
  eventhub_name       = "${var.environment.prefix}-cosmosdb-message-status-for-view"
  resource_group_name = "${var.environment.prefix}-${var.environment.env_short}-evt-rg"
}

data "azurerm_eventhub_authorization_rule" "evh_ns_io_auth_cdc" {
  name                = "${var.environment.prefix}-cdc"
  namespace_name      = "${var.environment.prefix}-${var.environment.env_short}-evh-ns"
  eventhub_name       = "${var.environment.prefix}-cosmosdb-message-status-for-view"
  resource_group_name = "${var.environment.prefix}-${var.environment.env_short}-evt-rg"
}

data "azurerm_eventhub_authorization_rule" "io-p-payments-weu-prod01-evh-ns_payment-updates_io-fn-messages-cqrs" {
  name                = "${var.environment.prefix}-fn-messages-cqrs"
  namespace_name      = "${var.environment.prefix}-${var.environment.env_short}-payments-weu-prod01-evh-ns"
  eventhub_name       = "payment-updates"
  resource_group_name = "${var.environment.prefix}-${var.environment.env_short}-payments-weu-prod01-evt-rg"
}

data "azurerm_eventhub_authorization_rule" "io-p-messages-weu-prod01-evh-ns_messages_io-fn-messages-cqrs" {
  name                = "${var.environment.prefix}-fn-messages-cqrs"
  namespace_name      = "${var.environment.prefix}-${var.environment.env_short}-messages-weu-prod01-evh-ns"
  eventhub_name       = "messages"
  resource_group_name = "${var.environment.prefix}-${var.environment.env_short}-messages-weu-prod01-evt-rg"
}

data "azurerm_eventhub_authorization_rule" "io-p-messages-weu-prod01-evh-ns_message-status_io-fn-messages-cqrs" {
  name                = "${var.environment.prefix}-fn-messages-cqrs"
  namespace_name      = "${var.environment.prefix}-${var.environment.env_short}-messages-weu-prod01-evh-ns"
  eventhub_name       = "message-status"
  resource_group_name = "${var.environment.prefix}-${var.environment.env_short}-messages-weu-prod01-evt-rg"
}

data "azurerm_key_vault_secret" "apim_services_subscription_key" {
  name         = "apim-IO-SERVICE-KEY"
  key_vault_id = var.common_key_vault.id
}

data "azurerm_virtual_network" "vnet_common" {
  name                = "${var.environment.prefix}-${var.environment.env_short}-vnet-common"
  resource_group_name = "${var.environment.prefix}-${var.environment.env_short}-rg-common"
}

data "azurerm_subnet" "cqrs_func" {
  name                 = "${var.environment.prefix}-${var.environment.env_short}-fn-messages-cqrs-snet"
  virtual_network_name = data.azurerm_virtual_network.vnet_common.name
  resource_group_name  = data.azurerm_virtual_network.vnet_common.resource_group_name
}

locals {
  cqrs_func = {
    ehns_enabled = true
    app_settings = {
      FUNCTIONS_WORKER_RUNTIME       = "node"
      WEBSITE_RUN_FROM_PACKAGE       = "1"
      WEBSITE_DNS_SERVER             = "168.63.129.16"
      FUNCTIONS_WORKER_PROCESS_COUNT = 4
      NODE_ENV                       = "production"

      COSMOSDB_NAME              = "db"
      COSMOSDB_URI               = var.io_com_cosmos.endpoint
      COSMOSDB_KEY               = var.io_com_cosmos.primary_key
      COSMOSDB_CONNECTION_STRING = format("AccountEndpoint=%s;AccountKey=%s;", var.io_com_cosmos.endpoint, var.io_com_cosmos.primary_key)

      REMOTE_CONTENT_COSMOSDB_URI               = var.io_com_cosmos.endpoint
      REMOTE_CONTENT_COSMOSDB_KEY               = var.io_com_cosmos.primary_key
      REMOTE_CONTENT_COSMOSDB_NAME              = "remote-content"
      REMOTE_CONTENT_COSMOSDB_CONNECTION_STRING = format("AccountEndpoint=%s;AccountKey=%s;", var.io_com_cosmos.endpoint, var.io_com_cosmos.primary_key)

      MESSAGE_CONFIGURATION_CHANGE_FEED_LEASE_PREFIX = "RemoteContentMessageConfigurationChangeFeed-00"
      MESSAGE_CONFIGURATION_CHANGE_FEED_START_TIME   = "0"

      LEASE_COLLECTION_PREFIX = "bulk-status-update-00"

      MESSAGE_VIEW_UPDATE_FAILURE_QUEUE_NAME         = "message-view-update-failures"
      MESSAGE_VIEW_PAYMENT_UPDATE_FAILURE_QUEUE_NAME = "message-view-paymentupdate-failures"
      MESSAGE_PAYMENT_UPDATER_FAILURE_QUEUE_NAME     = "message-paymentupdater-failures"
      MESSAGE_CONTAINER_NAME                         = "message-content"
      MESSAGE_CONTENT_STORAGE_CONNECTION             = var.message_content_storage.connection_string
      QueueStorageConnection                         = var.message_content_storage.connection_string

      MESSAGE_STATUS_FOR_VIEW_TOPIC_CONSUMER_CONNECTION_STRING = data.azurerm_eventhub_authorization_rule.evh_ns_io_auth_messages.primary_connection_string
      MESSAGE_STATUS_FOR_VIEW_TOPIC_CONSUMER_GROUP             = "${var.environment.prefix}-messages"
      MESSAGE_STATUS_FOR_VIEW_TOPIC_NAME                       = "${var.environment.prefix}-cosmosdb-message-status-for-view"
      MESSAGE_STATUS_FOR_VIEW_TOPIC_PRODUCER_CONNECTION_STRING = data.azurerm_eventhub_authorization_rule.evh_ns_io_auth_cdc.primary_connection_string
      MESSAGE_STATUS_FOR_VIEW_BROKERS                          = "${var.environment.prefix}-${var.environment.env_short}-evh-ns.servicebus.windows.net:9093"

      MESSAGE_CHANGE_FEED_LEASE_PREFIX = "CosmosApiMessageChangeFeed-00"
      // This must be expressed as a Timestamp
      // Saturday 1 July 2023 00:00:00
      MESSAGE_CHANGE_FEED_START_TIME = 1688169600000

      MESSAGES_TOPIC_CONNECTION_STRING = var.cqrs_func_ehns_enabled ? data.azurerm_eventhub_authorization_rule.io-p-messages-weu-prod01-evh-ns_messages_io-fn-messages-cqrs.primary_connection_string : ""
      MESSAGES_TOPIC_NAME              = "messages"

      MESSAGE_STATUS_FOR_REMINDER_TOPIC_PRODUCER_CONNECTION_STRING = var.cqrs_func_ehns_enabled ? data.azurerm_eventhub_authorization_rule.io-p-messages-weu-prod01-evh-ns_message-status_io-fn-messages-cqrs.primary_connection_string : ""
      MESSAGE_STATUS_FOR_REMINDER_TOPIC_NAME                       = "message-status"

      TARGETKAFKA_clientId        = "IO_FUNCTIONS_MESSAGES_CQRS"
      TARGETKAFKA_brokers         = "${var.environment.prefix}-${var.environment.env_short}-messages-weu-prod01-evh-ns.servicebus.windows.net:9093"
      TARGETKAFKA_ssl             = "true"
      TARGETKAFKA_sasl_mechanism  = "plain"
      TARGETKAFKA_sasl_username   = "$ConnectionString"
      TARGETKAFKA_sasl_password   = var.cqrs_func_ehns_enabled ? data.azurerm_eventhub_authorization_rule.io-p-messages-weu-prod01-evh-ns_messages_io-fn-messages-cqrs.primary_connection_string : ""
      TARGETKAFKA_idempotent      = "true"
      TARGETKAFKA_transactionalId = "IO_MESSAGES_CQRS"
      TARGETKAFKA_topic           = "messages"

      PAYMENT_FOR_VIEW_TOPIC_NAME                       = "payment-updates"
      PAYMENT_FOR_VIEW_TOPIC_CONSUMER_GROUP             = "$Default"
      PAYMENT_FOR_VIEW_TOPIC_CONSUMER_CONNECTION_STRING = data.azurerm_eventhub_authorization_rule.io-p-payments-weu-prod01-evh-ns_payment-updates_io-fn-messages-cqrs.primary_connection_string

      APIM_BASE_URL         = "https://api-app.internal.io.pagopa.it"
      APIM_SUBSCRIPTION_KEY = data.azurerm_key_vault_secret.apim_services_subscription_key.value

      PN_SERVICE_ID = "01G40DWQGKY5GRWSNM4303VNRP"
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

module "cqrs_func" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 0.0"

  environment = merge(var.environment, {
    app_name        = "cqrs"
    instance_number = "01"
  })

  resource_group_name = var.resource_group_name
  health_check_path   = "/api/v1/info"
  node_version        = 18

  tier = "xl"

  subnet_cidr                          = var.subnet_cidrs.cqrs_func
  subnet_pep_id                        = var.subnet_pep_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  app_settings = merge(
    local.cqrs_func.app_settings, {
      // disable listeners on production slot
      "AzureWebJobs.CosmosApiMessageStatusChangeFeedForView.Disabled"           = "0"
      "AzureWebJobs.CosmosApiMessageStatusChangeFeedForReminder.Disabled"       = "0"
      "AzureWebJobs.CosmosApiMessagesChangeFeed.Disabled"                       = "0"
      "AzureWebJobs.HandleMessageChangeFeedPublishFailures.Disabled"            = "0"
      "AzureWebJobs.CosmosApiChangeFeedForMessageRetention.Disabled"            = "1"
      "AzureWebJobs.CosmosRemoteContentMessageConfigurationChangeFeed.Disabled" = "0"
    }
  )
  slot_app_settings = merge(
    local.cqrs_func.app_settings, {
      // disable listeners on staging slot
      "AzureWebJobs.CosmosApiMessageStatusChangeFeedForView.Disabled"           = "1"
      "AzureWebJobs.CosmosApiMessageStatusChangeFeedForReminder.Disabled"       = "1"
      "AzureWebJobs.CosmosApiMessagesChangeFeed.Disabled"                       = "1"
      "AzureWebJobs.HandleMessageChangeFeedPublishFailures.Disabled"            = "1"
      "AzureWebJobs.CosmosApiChangeFeedForMessageRetention.Disabled"            = "1"
      "AzureWebJobs.CosmosRemoteContentMessageConfigurationChangeFeed.Disabled" = "1"
    }
  )

  tags = var.tags

  application_insights_connection_string   = var.application_insights.connection_string
  application_insights_sampling_percentage = 5

  action_group_id = var.action_group_id
}
