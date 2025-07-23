## Notification Hub
data "azurerm_notification_hub" "common" {
  name                = format("%s-common", local.nh_name_prefix)
  namespace_name      = format("%s-common", local.nh_namespace_prefix)
  resource_group_name = local.nh_resource_group_name
}
data "azurerm_notification_hub" "common_partition" {
  count               = local.nh_partition_count
  name                = format("%s-common-partition-%d", local.nh_name_prefix, count.index + 1)
  namespace_name      = format("%s-common-partition-%d", local.nh_namespace_prefix, count.index + 1)
  resource_group_name = local.nh_resource_group_name
}

## Key vaukt
data "azurerm_key_vault" "common" {
  name                = format("%s-kv-common", local.product)
  resource_group_name = format("%s-rg-common", local.product)
}
data "azurerm_key_vault_secret" "azure_nh_endpoint" {
  name         = "common-AZURE-NH-ENDPOINT"
  key_vault_id = data.azurerm_key_vault.common.id
}
data "azurerm_key_vault_secret" "azure_nh_partition1_endpoint" {
  name         = "common-partition-1-AZURE-NH-ENDPOINT"
  key_vault_id = data.azurerm_key_vault.common.id
}

data "azurerm_key_vault_secret" "azure_nh_partition2_endpoint" {
  name         = "common-partition-2-AZURE-NH-ENDPOINT"
  key_vault_id = data.azurerm_key_vault.common.id
}
data "azurerm_key_vault_secret" "azure_nh_partition3_endpoint" {
  name         = "common-partition-3-AZURE-NH-ENDPOINT"
  key_vault_id = data.azurerm_key_vault.common.id
}
data "azurerm_key_vault_secret" "azure_nh_partition4_endpoint" {
  name         = "common-partition-4-AZURE-NH-ENDPOINT"
  key_vault_id = data.azurerm_key_vault.common.id
}


## Application insights

data "azurerm_monitor_action_group" "io_com_action_group" {
  name                = "io-p-com-error-ag-01"
  resource_group_name = "io-p-itn-com-rg-01"
}

locals {

  product = "io-p"

  ## Notification Hub
  nh_resource_group_name = "io-p-rg-common"
  nh_name_prefix         = "io-p-ntf"
  nh_namespace_prefix    = "io-p-ntfns"
  nh_partition_count     = 4

  ## Appliction insights
  application_insights_name   = "io-p-ai-common"
  monitor_resource_group_name = "io-p-rg-common"

  test_users_internal_load = [
    "AAAAAA00A00A000C",
    "AAAAAA00A00A000D",
    "AAAAAA00A00A000E",
  ]

  function_push_notif = {


    app_settings_common = {
      FUNCTIONS_WORKER_RUNTIME       = "node"
      WEBSITE_RUN_FROM_PACKAGE       = "1"
      FUNCTIONS_WORKER_PROCESS_COUNT = 4
      NODE_ENV                       = "production"

      // Keepalive fields are all optionals
      FETCH_KEEPALIVE_ENABLED             = "true"
      FETCH_KEEPALIVE_SOCKET_ACTIVE_TTL   = "110000"
      FETCH_KEEPALIVE_MAX_SOCKETS         = "40"
      FETCH_KEEPALIVE_MAX_FREE_SOCKETS    = "10"
      FETCH_KEEPALIVE_FREE_SOCKET_TIMEOUT = "30000"
      FETCH_KEEPALIVE_TIMEOUT             = "60000"

      FISCAL_CODE_NOTIFICATION_BLACKLIST = join(",", local.test_users_internal_load)

      NOTIFICATIONS_QUEUE_NAME = "push-notifications"
      # NOTIFICATIONS_STORAGE_CONNECTION_STRING = data.azurerm_storage_account.push_notifications_storage.primary_connection_string
      NOTIFICATIONS_STORAGE_CONNECTION_STRING = var.com_st_connectiostring

      NOTIFY_MESSAGE_QUEUE_NAME = "notify-message"

      // activity default retry attempts
      RETRY_ATTEMPT_NUMBER = 10


      # ------------------------------------------------------------------------------
      # Notification Hubs variables

      # Endpoint for the test notification hub namespace
      AZURE_NH_HUB_NAME                                = data.azurerm_notification_hub.common.name
      "AzureWebJobs.HandleNHNotificationCall.Disabled" = "0"
      # Endpoint for the test notification hub namespace
      NH1_PARTITION_REGEX = "^[0-3]"
      NH1_NAME            = data.azurerm_notification_hub.common_partition[0].name
      NH2_PARTITION_REGEX = "^[4-7]"
      NH2_NAME            = data.azurerm_notification_hub.common_partition[1].name
      NH3_PARTITION_REGEX = "^[8-b]"
      NH3_NAME            = data.azurerm_notification_hub.common_partition[2].name
      NH4_PARTITION_REGEX = "^[c-f]"
      NH4_NAME            = data.azurerm_notification_hub.common_partition[3].name

      AZURE_NH_ENDPOINT = data.azurerm_key_vault_secret.azure_nh_endpoint.value
      NH1_ENDPOINT      = data.azurerm_key_vault_secret.azure_nh_partition1_endpoint.value
      NH2_ENDPOINT      = data.azurerm_key_vault_secret.azure_nh_partition2_endpoint.value
      NH3_ENDPOINT      = data.azurerm_key_vault_secret.azure_nh_partition3_endpoint.value
      NH4_ENDPOINT      = data.azurerm_key_vault_secret.azure_nh_partition4_endpoint.value
      # ------------------------------------------------------------------------------


      # ------------------------------------------------------------------------------
      # Variable used during transition to new NH management

      # Possible values : "none" | "all" | "beta" | "canary"
      NH_PARTITION_FEATURE_FLAG = "all"


      MESSAGE_CONTAINER_NAME                    = "message-content"
      MESSAGE_CONTENT_STORAGE_CONNECTION_STRING = var.message_content_storage.connection_string

      SESSION_MANAGER_API_KEY  = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=session-manager-api-key)",
      SESSION_MANAGER_BASE_URL = var.session_manager_base_url,

      COSMOSDB_NAME = "db"
      COSMOSDB_URI  = var.cosmosdb_account_api.endpoint

      REMOTE_CONTENT_COSMOSDB_NAME             = "remote-content-cosmos-01"
      REMOTE_CONTENT_COSMOSDB_URI              = var.io_com_cosmos.endpoint
      REMOTE_CONTENT_COSMOSDB__accountEndpoint = var.io_com_cosmos.endpoint

      AzureFunctionsJobHost__extensions__durableTask__storageProvider__partitionCount = "8"
    }
    app_settings_1 = {
    }
    app_settings_2 = {
    }
  }
}

#tfsec:ignore:azure-storage-queue-services-logging-enabled:exp:2022-05-01 # already ignored, maybe a bug in tfsec
module "push_notif_function" {

  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 0.0"

  count = 1

  application_insights_key = var.application_insights.instrumentation_key

  resource_group_name   = var.resource_group_name
  health_check_path     = "/api/v1/info"
  has_durable_functions = true
  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  private_dns_zone_resource_group_name   = var.private_dns_zone_resource_group_name
  application_insights_connection_string = var.application_insights.connection_string

  environment = merge(var.environment, {
    app_name        = "pushnotif"
    instance_number = "01"
  })

  subnet_pep_id = var.subnet_pep_id
  subnet_cidr   = var.subnet_cidrs.push_notif_func
  tags          = var.tags

  app_settings = merge(
    local.function_push_notif.app_settings_common, {
      "AzureWebJobs.HandleNHNotificationCall.Disabled"               = "0",
      "AzureWebJobs.HandleNHNotifyMessageCallActivityQueue.Disabled" = "0"
    }
  )

  sticky_app_setting_names = [
    "AzureWebJobs.HandleNHNotificationCall.Disabled",
    "AzureWebJobs.HandleNHNotifyMessageCallActivityQueue.Disabled"
  ]

  slot_app_settings = merge(
    local.function_push_notif.app_settings_common, {
      "AzureWebJobs.HandleNHNotificationCall.Disabled"               = "1",
      "AzureWebJobs.HandleNHNotifyMessageCallActivityQueue.Disabled" = "1"
    }
  )

  action_group_id = data.azurerm_monitor_action_group.io_com_action_group.id
}

module "push_notif_autoscaler" {
  source  = "pagopa-dx/azure-app-service-plan-autoscaler/azurerm"
  version = "~> 1.0"

  app_service_plan_id = module.push_notif_function[0].function_app.plan.id
  location            = var.environment.location

  resource_group_name = module.push_notif_function[0].function_app.resource_group_name

  target_service = {
    function_app = {
      name = module.push_notif_function[0].function_app.function_app.name
    }
  }

  scheduler = {
    high_load = {
      name = "high_load_profile"
      start = {
        hour    = 11
        minutes = 00
      }
      end = {
        hour    = 14
        minutes = 59
      }
      default = 12
      minimum = 4
    }
    low_load = {
      name = "low_load_profile"
      start = {
        hour    = 23
        minutes = 00
      }
      end = {
        hour    = 06
        minutes = 59
      }
      default = 10
      minimum = 2
    }
    normal_load = {
      default = 11
      minimum = 3
    }
    maximum = 30
  }

  tags = var.tags
}

resource "azurerm_role_assignment" "pushnotif_key_vault_secrets_user" {
  scope                = var.key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.push_notif_function[0].function_app.function_app.principal_id
}

resource "azurerm_role_assignment" "pushnotif_slot_key_vault_secrets_user" {
  scope                = var.key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.push_notif_function[0].function_app.function_app.slot.principal_id
}

resource "azurerm_role_assignment" "pushnotif_cosmosdb_account_api_contributor" {
  for_each = toset([
    module.push_notif_function[0].function_app.function_app.principal_id,
    module.push_notif_function[0].function_app.function_app.slot.principal_id
  ])
  scope                = var.cosmosdb_account_api.id
  role_definition_name = "SQL DB Contributor"
  principal_id         = each.value
}

resource "azurerm_cosmosdb_sql_role_assignment" "pushnotif_cosmosdb_account_api" {
  for_each = toset([
    module.push_notif_function[0].function_app.function_app.principal_id,
    module.push_notif_function[0].function_app.function_app.slot.principal_id
  ])
  resource_group_name = var.cosmosdb_account_api.resource_group_name
  account_name        = var.cosmosdb_account_api.name
  scope               = var.cosmosdb_account_api.id
  role_definition_id  = "${var.cosmosdb_account_api.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = each.value
}


