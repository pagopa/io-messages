data "azurerm_resource_group" "notifications_rg" {
  name = "io-p-weu-messages-notifications-rg"
}

## Storage account
# data "azurerm_storage_account" "push_notifications_storage" {
#   name                = "iopweumessagesnotifst"
#   resource_group_name = data.azurerm_resource_group.notifications_rg.name
# }
# data "azurerm_storage_account" "push_notif_beta_storage" {
#   name                = "iopweumessagesbetauserst"
#   resource_group_name = data.azurerm_resource_group.notifications_rg.name
# }

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
data "azurerm_application_insights" "application_insights" {
  name                = local.application_insights_name
  resource_group_name = local.monitor_resource_group_name
}
data "azurerm_monitor_action_group" "io_com_action_group" {
  name                = "io-p-com-error-ag-01"
  resource_group_name = "io-p-itn-com-rg-01"
}

locals {

  product            = "io-p"
  push_notif_enabled = true

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
      NH_PARTITION_FEATURE_FLAG            = "all"
      NOTIFY_VIA_QUEUE_FEATURE_FLAG        = "all"
      BETA_USERS_STORAGE_CONNECTION_STRING = var.com_st_connectiostring
      BETA_USERS_TABLE_NAME                = "notificationhub"

      # Takes ~6,25% of users
      CANARY_USERS_REGEX = "^([(0-9)|(a-f)|(A-F)]{63}0)$"
      # ------------------------------------------------------------------------------

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

  source  = "pagopa/dx-azure-function-app/azurerm"
  version = "~>0"

  count                 = local.push_notif_enabled ? 1 : 0
  resource_group_name   = var.resource_group_name
  health_check_path     = "/api/v1/info"
  has_durable_functions = true
  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  private_dns_zone_resource_group_name   = var.private_dns_zone_resource_group_name
  application_insights_connection_string = data.azurerm_application_insights.application_insights.connection_string

  environment = merge(var.environment, {
    app_name        = "pushnotif"
    instance_number = "01"
  })

  subnet_pep_id = var.subnet_pep_id
  subnet_cidr   = var.subnet_cidrs.push_notif_func
  tags          = var.tags


  app_settings = merge(
    local.function_push_notif.app_settings_common, {
      "AzureWebJobs.HandleNHNotificationCall.Disabled"               = "1",
      "AzureWebJobs.HandleNHNotifyMessageCallActivityQueue.Disabled" = "1"
    }
  )

  # sticky_app_setting_names = [
  #   "AzureWebJobs.HandleNHNotificationCall.Disabled",
  #   "AzureWebJobs.HandleNHNotifyMessageCallActivityQueue.Disabled"
  # ]

  slot_app_settings = merge(
    local.function_push_notif.app_settings_common, {
      "AzureWebJobs.HandleNHNotificationCall.Disabled"               = "1",
      "AzureWebJobs.HandleNHNotifyMessageCallActivityQueue.Disabled" = "1"
    }
  )

  action_group_id = data.azurerm_monitor_action_group.io_com_action_group.id

}


# resource "azurerm_role_assignment" "push_notif_com_st" {
#   for_each = toset([
#     module.push_notif_function.function_app.function_app.principal_id,
#     module.push_notif_function.function_app.function_app.slot.principal_id
#   ])
#   scope                = var.com_st_id
#   role_definition_name = "Storage Table Data Contributor"
#   principal_id         = each.value
# }

# resource "azurerm_role_assignment" "push_notif_com_st_queue" {
#   for_each = toset([
#     module.push_notif_function.function_app.function_app.principal_id,
#     module.push_notif_function.function_app.function_app.slot.principal_id
#   ])
#   scope                = var.com_st_id
#   role_definition_name = "Storage Queue Data Contributor"
#   principal_id         = each.value
# }



resource "azurerm_monitor_autoscale_setting" "push_notif_function" {
  count               = local.push_notif_enabled ? 1 : 0
  name                = replace(module.push_notif_function[0].function_app.function_app.name, "func", "as")
  resource_group_name = var.resource_group_name
  location            = var.environment.location
  target_resource_id  = module.push_notif_function[0].function_app.plan.id

  profile {
    name = "default"

    capacity {
      default = 3
      minimum = 2
      maximum = 8
    }

    rule {
      metric_trigger {
        metric_name              = "Requests"
        metric_resource_id       = module.push_notif_function[0].function_app.function_app.id
        metric_namespace         = "microsoft.web/sites"
        time_grain               = "PT1M"
        statistic                = "Max"
        time_window              = "PT1M"
        time_aggregation         = "Maximum"
        operator                 = "GreaterThan"
        threshold                = 3000
        divide_by_instance_count = true
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "2"
        cooldown  = "PT1M"
      }
    }

    rule {
      metric_trigger {
        metric_name              = "CpuPercentage"
        metric_resource_id       = module.push_notif_function[0].function_app.plan.id
        metric_namespace         = "microsoft.web/serverfarms"
        time_grain               = "PT1M"
        statistic                = "Max"
        time_window              = "PT1M"
        time_aggregation         = "Maximum"
        operator                 = "GreaterThan"
        threshold                = 40
        divide_by_instance_count = false
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "3"
        cooldown  = "PT2M"
      }
    }

    rule {
      metric_trigger {
        metric_name              = "Requests"
        metric_resource_id       = module.push_notif_function[0].function_app.function_app.id
        metric_namespace         = "microsoft.web/sites"
        time_grain               = "PT1M"
        statistic                = "Average"
        time_window              = "PT5M"
        time_aggregation         = "Average"
        operator                 = "LessThan"
        threshold                = 300
        divide_by_instance_count = true
      }

      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT1M"
      }
    }

    rule {
      metric_trigger {
        metric_name              = "CpuPercentage"
        metric_resource_id       = module.push_notif_function[0].function_app.plan.id
        metric_namespace         = "microsoft.web/serverfarms"
        time_grain               = "PT1M"
        statistic                = "Average"
        time_window              = "PT5M"
        time_aggregation         = "Average"
        operator                 = "LessThan"
        threshold                = 15
        divide_by_instance_count = false
      }

      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT1M"
      }
    }
  }
}
