data "azurerm_resource_group" "notifications_rg" {
  name = "io-p-weu-messages-notifications-rg"
}

## Storage account
data "azurerm_storage_account" "push_notifications_storage" {
  name                = "iopweumessagesnotifst"
  resource_group_name = data.azurerm_resource_group.notifications_rg.name
}
data "azurerm_storage_account" "push_notif_beta_storage" {
  name                = "iopweumessagesbetauserst"
  resource_group_name = data.azurerm_resource_group.notifications_rg.name
}

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

# # Virtual network
# data "azurerm_virtual_network" "vnet_common" {
#   name                = local.vnet_common_name
#   resource_group_name = local.vnet_common_resource_group_name
# }

##Subnet

# data "azurerm_subnet" "push_notifications_func_subnet" {
#   name                 = "io-p-messages-weu-prod01-push-notif-snet"
#   virtual_network_name = data.azurerm_virtual_network.vnet_common.name
#   resource_group_name  = data.azurerm_virtual_network.vnet_common.resource_group_name
# }

# data "azurerm_subnet" "private_endpoints_subnet" {
#   name                 = "pendpoints"
#   virtual_network_name = local.vnet_common_name
#   resource_group_name  = local.vnet_common_resource_group_name
# }
# data "azurerm_subnet" "azdoa_snet" {
#   name                 = "azure-devops"
#   virtual_network_name = local.vnet_common_name
#   resource_group_name  = local.vnet_common_resource_group_name
# }

## Application insights
data "azurerm_application_insights" "application_insights" {
  name                = local.application_insights_name
  resource_group_name = local.monitor_resource_group_name
}
data "azurerm_monitor_action_group" "io_com_action_group" {
  name                = "io-p-com-error-ag-01"
  resource_group_name = "io-p-itn-com-rg-01"
}

## Private dns zone
# data "azurerm_private_dns_zone" "privatelink_blob_core_windows_net" {
#   name                = "privatelink.blob.core.windows.net"
#   resource_group_name = format("%s-rg-common", local.product)
# }

# data "azurerm_private_dns_zone" "privatelink_queue_core_windows_net" {
#   name                = "privatelink.queue.core.windows.net"
#   resource_group_name = format("%s-rg-common", local.product)
# }

# data "azurerm_private_dns_zone" "privatelink_table_core_windows_net" {
#   name                = "privatelink.table.core.windows.net"
#   resource_group_name = format("%s-rg-common", local.product)
# }

locals {

  location                      = "westeurope"
  domain                        = "messages"
  product                       = "io-p"
  project                       = "io-p-messages-weu-prod01"
  push_notif_enabled            = true
  push_notif_function_always_on = true

  ## Notification Hub
  nh_resource_group_name = "io-p-rg-common"
  nh_name_prefix         = "io-p-ntf"
  nh_namespace_prefix    = "io-p-ntfns"
  nh_partition_count     = 4

  ## Virtual net / subnet
  vnet_common_name                = "${local.product}-vnet-common"
  vnet_common_resource_group_name = "${local.product}-rg-common"
  cidr_subnet_push_notif          = ["10.0.141.0/26"]


  ## Appliction insights
  application_insights_name   = "io-p-ai-common"
  monitor_resource_group_name = "io-p-rg-common"

  ## Push notification app
  push_notif_function_kind     = "Linux"
  push_notif_function_sku_tier = "PremiumV3"
  push_notif_function_sku_size = "P1v3"

  ## Tags
  tags = {
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    BusinessUnit   = "App IO"
    Source         = "https://github.com/pagopa/io-infra/blob/main/src/domains/messages-app"
    ManagementTeam = "IO Comunicazione"
    CostCenter     = "TS000 - Tecnologia e Servizi"
  }

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

      NOTIFICATIONS_QUEUE_NAME                = "push-notifications"
      NOTIFICATIONS_STORAGE_CONNECTION_STRING = data.azurerm_storage_account.push_notifications_storage.primary_connection_string

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
      BETA_USERS_STORAGE_CONNECTION_STRING = data.azurerm_storage_account.push_notif_beta_storage.primary_connection_string
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

# Subnet to host push notif function
# module "push_notif_snet" {
#   source                                    = "github.com/pagopa/terraform-azurerm-v3//subnet?ref=v8.27.0"
#   name                                      = format("%s-push-notif-snet", local.project)
#   address_prefixes                          = local.cidr_subnet_push_notif
#   resource_group_name                       = data.azurerm_virtual_network.vnet_common.resource_group_name
#   virtual_network_name                      = data.azurerm_virtual_network.vnet_common.name
#   private_endpoint_network_policies_enabled = false

#   service_endpoints = [
#     "Microsoft.Web",
#     "Microsoft.AzureCosmosDB",
#     "Microsoft.Storage",
#   ]

#   delegation = {
#     name = "default"
#     service_delegation = {
#       name    = "Microsoft.Web/serverFarms"
#       actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
#     }
#   }
# }

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

  subnet_pep_id = var.subnet_pep_id
  subnet_cidr   = var.subnet_cidrs.push_notif_func
  tags          = var.tags

  slot_app_settings = merge(
    local.function_push_notif.app_settings_common, {
      "AzureWebJobs.HandleNHNotificationCall.Disabled"               = "1",
      "AzureWebJobs.HandleNHNotifyMessageCallActivityQueue.Disabled" = "1"
    }
  )

  action_group_id = data.azurerm_monitor_action_group.io_com_action_group.id

  # name                = format("%s-push-notif-fn", local.product)
  # domain              = upper(local.domain)
  # location            = local.location
  #

  # health_check_maxpingfailures = 2

  # runtime_version                          = "~4"
  # node_version                             = "18"
  # always_on                                = local.push_notif_function_always_on
  # application_insights_instrumentation_key = data.azurerm_application_insights.application_insights.instrumentation_key

  # app_service_plan_info = {
  #   kind                         = local.push_notif_function_kind
  #   sku_tier                     = local.push_notif_function_sku_tier
  #   sku_size                     = local.push_notif_function_sku_size
  #   maximum_elastic_worker_count = 0
  #   worker_count                 = null
  #   zone_balancing_enabled       = false
  # }

  # internal_storage = {
  #   "enable"                     = true,
  #   "private_endpoint_subnet_id" = data.azurerm_subnet.private_endpoints_subnet.id,
  #   "private_dns_zone_blob_ids"  = [data.azurerm_private_dns_zone.privatelink_blob_core_windows_net.id],
  #   "private_dns_zone_queue_ids" = [data.azurerm_private_dns_zone.privatelink_queue_core_windows_net.id],
  #   "private_dns_zone_table_ids" = [data.azurerm_private_dns_zone.privatelink_table_core_windows_net.id],
  #   "queues"                     = [],
  #   "containers"                 = [],
  #   "blobs_retention_days"       = 1,
  # }

  # storage_account_info = {
  #   account_tier                      = "Standard"
  #   account_replication_type          = "ZRS"
  #   public_network_access_enabled     = true
  #   access_tier                       = "Hot"
  #   account_kind                      = "StorageV2"
  #   advanced_threat_protection_enable = true
  #   use_legacy_defender_version       = true
  # }

  # internal_storage_account_info = {
  #   account_tier                      = "Standard"
  #   account_replication_type          = "ZRS"
  #   public_network_access_enabled     = true
  #   access_tier                       = "Hot"
  #   account_kind                      = "StorageV2"
  #   advanced_threat_protection_enable = false
  #   use_legacy_defender_version       = true
  # }

  # allowed_subnets = [
  #   module.push_notif_snet.id
  # ]

  # allowed_ips = concat(
  #   [],
  # )

  # Action groups for alerts
  # action = [
  #   {
  #     action_group_id    = data.azurerm_monitor_action_group.io_com_action_group.id
  #     webhook_properties = {}
  #   }
  # ]


}

# module "push_notif_function_staging_slot" {
#   count  = local.push_notif_enabled ? 1 : 0
#   source = "github.com/pagopa/terraform-azurerm-v3//function_app_slot?ref=v8.27.0"

#   name                = "staging"
#   location            = local.location
#   resource_group_name = azurerm_resource_group.push_notif_rg.name
#   function_app_id     = module.push_notif_function[0].id
#   app_service_plan_id = module.push_notif_function[0].app_service_plan_id

#   health_check_path            = "/api/v1/info"
#   health_check_maxpingfailures = 2

#   storage_account_name       = module.push_notif_function[0].storage_account.name
#   storage_account_access_key = module.push_notif_function[0].storage_account.primary_access_key

#   internal_storage_connection_string = module.push_notif_function[0].storage_account_internal_function.primary_connection_string

#   runtime_version                          = "~4"
#   node_version                             = "18"
#   always_on                                = local.push_notif_function_always_on
#   application_insights_instrumentation_key = data.azurerm_application_insights.application_insights.instrumentation_key

#   app_settings = merge(
#     local.function_push_notif.app_settings_common, {
#       "AzureWebJobs.HandleNHNotificationCall.Disabled"               = "1",
#       "AzureWebJobs.HandleNHNotifyMessageCallActivityQueue.Disabled" = "1"
#     }
#   )

#   subnet_id = module.push_notif_snet.id

#   allowed_subnets = [
#     module.push_notif_snet.id,
#     data.azurerm_subnet.azdoa_snet.id,
#   ]

#   allowed_ips = concat(
#     [],
#   )

#   tags = local.tags
# }

resource "azurerm_monitor_autoscale_setting" "push_notif_function" {
  count               = local.push_notif_enabled ? 1 : 0
  name                = "${replace(module.push_notif_function[0].function_app.function_app.name, "fn", "as")}-01"
  resource_group_name = var.resource_group_name
  location            = local.location
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
