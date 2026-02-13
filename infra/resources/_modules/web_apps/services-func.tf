locals {
  services_func = {
    app_settings = {
      FUNCTIONS_WORKER_RUNTIME       = "node"
      WEBSITE_RUN_FROM_PACKAGE       = "1"
      WEBSITE_DNS_SERVER             = "168.63.129.16"
      FUNCTIONS_WORKER_PROCESS_COUNT = 4
      NODE_ENV                       = "production"

      MAILUP_USERNAME = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=mailup-username)",
      MAILUP_SECRET   = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=mailup-secret)",

      FETCH_KEEPALIVE_ENABLED             = "true"
      FETCH_KEEPALIVE_SOCKET_ACTIVE_TTL   = "110000"
      FETCH_KEEPALIVE_MAX_SOCKETS         = "40"
      FETCH_KEEPALIVE_MAX_FREE_SOCKETS    = "10"
      FETCH_KEEPALIVE_FREE_SOCKET_TIMEOUT = "30000"
      FETCH_KEEPALIVE_TIMEOUT             = "60000"

      PROCESSING_MESSAGE_CONTAINER_NAME       = "processing-message"
      MESSAGE_CREATED_QUEUE_NAME              = "message-created"
      MESSAGE_PROCESSED_QUEUE_NAME            = "message-processed"
      NOTIFICATION_CREATED_EMAIL_QUEUE_NAME   = "notification-created-email"
      NOTIFICATION_CREATED_WEBHOOK_QUEUE_NAME = "notification-created-webhook"
      MESSAGE_CONTAINER_NAME                  = "message-content"

      COSMOSDB_NAME = "db"
      COSMOSDB_URI  = var.cosmosdb_account_api.endpoint
      COSMOSDB_KEY  = var.cosmosdb_account_api.primary_key

      MESSAGE_CONTENT_STORAGE_CONNECTION_STRING = var.message_content_storage.connection_string
      IO_COM_STORAGE_CONNECTION_STRING          = var.com_st_connectiostring

      MAIL_FROM = "IO - l'app dei servizi pubblici <no-reply@io.italia.it>"
      // we keep this while we wait for new app version to be deployed
      MAIL_FROM_DEFAULT = "IO - l'app dei servizi pubblici <no-reply@io.italia.it>"

      PAGOPA_ECOMMERCE_BASE_URL = "https://api.platform.pagopa.it/ecommerce/payment-requests-service/v1"

      APIM_BASE_URL = "https://api-app.internal.io.pagopa.it"

      OPT_OUT_EMAIL_SWITCH_DATE = 1625781600
      FF_OPT_IN_EMAIL_ENABLED   = "true"

      // minimum app version that introduces read status opt-out
      // NOTE: right now is set to a non existing version, since it's not yet deployed
      // This way we can safely deploy fn-services without enabling ADVANCED functionalities
      MIN_APP_VERSION_WITH_READ_AUTH = "2.14.0"

      // the duration of message and message-status for those messages sent to user not registered on IO.
      TTL_FOR_USER_NOT_FOUND = "${60 * 60 * 24 * 365 * 3}" //3 years in seconds

      #########################
      # Secrets
      #########################
      WEBHOOK_CHANNEL_URL                  = "https://${module.remote_content_func.function_app.function_app.default_hostname}/api/v1/notify"
      SANDBOX_FISCAL_CODE                  = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=services-sandbox-fiscalcode)"
      EMAIL_NOTIFICATION_SERVICE_BLACKLIST = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=services-email-blacklist-service-id)"
      APIM_SUBSCRIPTION_KEY                = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=services-apim-subscription-key)"
      PAGOPA_ECOMMERCE_API_KEY             = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=services-pagopa-ecommerce-prod-api-key)",
      SENDING_FUNC_API_KEY                 = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=rc-func-key)"
      SENDING_FUNC_API_URL                 = "https://${module.remote_content_func.function_app.function_app.default_hostname}"

      NOTIFY_API_URL = "https://${module.push_notif_function[0].function_app.function_app.default_hostname}"
      NOTIFY_API_KEY = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=pushnotif-func-key)"

    }
  }
}
module "services_func" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 1.0"

  environment = merge(var.environment, {
    app_name        = "services"
    instance_number = "01"
  })

  resource_group_name = var.resource_group_name
  health_check_path   = "/api/info"
  node_version        = 20

  tier = "xl"

  subnet_cidr                          = var.subnet_cidrs.services_func
  subnet_pep_id                        = var.subnet_pep_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  app_settings = local.services_func.app_settings
  slot_app_settings = merge(
    local.services_func.app_settings,
    {
      "AzureWebJobs.CreateNotification.Disabled"     = "1"
      "AzureWebJobs.EmailNotification.Disabled"      = "1"
      "AzureWebJobs.OnFailedProcessMessage.Disabled" = "1"
      "AzureWebJobs.ProcessMessage.Disabled"         = "1"
      "AzureWebJobs.WebhookNotification.Disabled"    = "1"
    }
  )

  sticky_app_setting_names = ["AzureWebJobs.CreateNotification.Disabled", "AzureWebJobs.EmailNotification.Disabled", "AzureWebJobs.OnFailedProcessMessage.Disabled", "AzureWebJobs.ProcessMessage.Disabled", "AzureWebJobs.WebhookNotification.Disabled"]

  tags = var.tags

  application_insights_connection_string   = var.application_insights.connection_string
  application_insights_sampling_percentage = 5

  action_group_id = var.action_group_id
}

module "services_func_autoscaler" {
  source  = "pagopa-dx/azure-app-service-plan-autoscaler/azurerm"
  version = "~> 1.0"

  resource_group_name = module.services_func.function_app.resource_group_name
  location            = var.environment.location

  app_service_plan_id = module.services_func.function_app.plan.id

  target_service = {
    function_app = {
      name = module.services_func.function_app.function_app.name
    }
  }

  scale_metrics = {
    cpu = {
      cooldown_decrease         = 20,
      cooldown_increase         = 3,
      decrease_by               = 3,
      increase_by               = 3,
      lower_threshold           = 20,
      statistic_decrease        = "Max",
      statistic_increase        = "Max",
      time_aggregation_decrease = "Maximum",
      time_aggregation_increase = "Maximum",
      time_window_decrease      = 5,
      time_window_increase      = 2,
      upper_threshold           = 50
    },
  }

  scheduler = {
    normal_load = {
      default = 11,
      minimum = 6
    },
    low_load = {
      minimum = 2,
      name    = "low_load_profile",
      default = 10,
      start = {
        hour    = 22,
        minutes = 0
      }
      end = {
        hour    = 5,
        minutes = 0
      },
    },
    maximum = 30,
  }

  tags = var.tags
}

resource "azurerm_subnet_nat_gateway_association" "services_func_subnet" {
  subnet_id      = module.services_func.subnet.id
  nat_gateway_id = var.nat_gateway_id
}

resource "azurerm_role_assignment" "services_key_vault_secrets_user" {
  scope                = var.key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.services_func.function_app.function_app.principal_id
}

resource "azurerm_role_assignment" "services_slot_key_vault_secrets_user" {
  scope                = var.key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.services_func.function_app.function_app.slot.principal_id
}

resource "azurerm_role_assignment" "services_func_stapi_container_read" {
  scope                = "${var.messages_storage_account.id}/blobServices/default/containers/${var.messages_content_container.name}"
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = module.services_func.function_app.function_app.principal_id
}

resource "azurerm_role_assignment" "services_func_stapi_container_read_slot" {
  scope                = "${var.messages_storage_account.id}/blobServices/default/containers/${var.messages_content_container.name}"
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = module.services_func.function_app.function_app.slot.principal_id
}

resource "azurerm_role_assignment" "services_func_com_st_queue" {
  scope                = var.com_st_id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = module.services_func.function_app.function_app.principal_id
}

resource "azurerm_role_assignment" "services_func_com_st_queue_slot" {

  scope                = var.com_st_id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = module.services_func.function_app.function_app.slot.principal_id
}

resource "azurerm_role_assignment" "services_func_com_st_blob" {
  scope                = var.com_st_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.services_func.function_app.function_app.principal_id
}

resource "azurerm_role_assignment" "services_func_com_st_blob_slot" {
  scope                = var.com_st_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.services_func.function_app.function_app.slot.principal_id
}

resource "azurerm_cosmosdb_sql_role_assignment" "services_func" {
  resource_group_name = var.cosmosdb_account_api.resource_group_name
  account_name        = var.cosmosdb_account_api.name
  role_definition_id  = "${var.cosmosdb_account_api.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = module.services_func.function_app.function_app.principal_id
  scope               = var.cosmosdb_account_api.id
}

resource "azurerm_role_assignment" "services_cosmosdb_account_api" {
  for_each = toset([
    module.services_func.function_app.function_app.principal_id,
    module.services_func.function_app.function_app.slot.principal_id
  ])
  scope                = var.cosmosdb_account_api.id
  role_definition_name = "SQL DB Contributor"
  principal_id         = each.value
}
