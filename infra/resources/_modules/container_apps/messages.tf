locals {
  messages_ca_environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = "messages"
    instance_number = "01"
  }
}

module "messages_ca" {
  source  = "pagopa-dx/azure-container-app/azurerm"
  version = "~> 6.1"

  environment = local.messages_ca_environment

  container_app_environment_id = module.com_cae_env.id

  log_analytics_workspace_id = var.log_analytics_workspace_id

  containers = [
    {
      image = "ghcr.io/pagopa/io-com-messages"
      name  = "io-messages"

      app_settings = {
        HOST                            = "0.0.0.0"
        NODE_ENV                        = "production"
        PORT                            = 3000
        COMMON_COSMOS_DATABASE_NAME     = "db"
        MESSAGE_METADATA_CONTAINER_NAME = "messages"
        MESSAGE_STATUS_CONTAINER_NAME   = "message-status"
        MESSAGE_CONTENT_CONTAINER_NAME  = "message-content"
        RC_APP_BASE_URL                 = "https://${module.remote_content_ca.url}/api/internal/rc-configurations"
        SERVICE_TO_RC_MAP = jsonencode({
          "01G40DWQGKY5GRWSNM4303VNRP" = "01HMVMHCZZ8D0VTFWMRHBM5D6F", # PN
          "01GQQZ9HF5GAPRVKJM1VDAVFHM" = "01HMVMDTHXCESMZ72NA701EKGQ", # IO Sign
          "01H4ZJ62C1CPGJ0PX8Q1BP7FAB" = "01HMVMCDD3JFYTPKT4ZN4WQ73B", # PagoPA Receipt (Test)
          "01HD63674XJ1R6XCNHH24PCRR2" = "01HMVM9W74RWH93NT1EYNKKNNR", # PagoPA Receipt
          "01GQQDPM127KFGG6T3660D5TXD" = "01HMVM4N4XFJ8VBR1FXYFZ9QFB", # Third Party Mock
        })

        COMMON_COSMOS_URI          = var.common_cosmos_account.endpoint
        COMMON_STORAGE_ACCOUNT_URI = var.common_storage_account.endpoint

        COMMUNICATION_STORAGE_ACCOUNT_URI = var.communication_storage_account_uri
        COMMUNICATION_STORAGE_QUEUE_URI   = var.communication_storage_queue_uri

        PN_SERVICE_ID = "01G40DWQGKY5GRWSNM4303VNRP" # PN

        APPLICATIONINSIGHTS_CONNECTION_STRING     = var.application_insights.connection_string
        APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED = "true"

        APIM_BASE_URL         = "https://io-p-itn-svc-services-ca-01.ambitioussea-e5d71305.italynorth.azurecontainerapps.io"
        APIM_SUBSCRIPTION_KEY = "dummy"

        MESSAGE_CREATED_QUEUE_NAME        = "message-created-v2"
        PROCESSING_MESSAGE_CONTAINER_NAME = "processing-message"
      }

      liveness_probe = {
        path = "/api/info"
      }
    },
  ]

  autoscaler = {
    replicas = {
      minimum = 0
      maximum = 8
    }
  }

  container_port = 3000

  resource_group_name = var.resource_group_name

  tags = var.tags
}

module "azure-role-assignments" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 3.0"

  principal_id    = module.messages_ca.principal_id
  subscription_id = var.subscription_id

  storage_blob = [
    {
      storage_account_name = var.common_storage_account.name
      resource_group_name  = var.common_storage_account.resource_group_name
      container_name       = "message-content"
      role                 = "reader"
      description          = "Allow web app to read blob"
    },
    {
      storage_account_name = var.communication_storage_account_name
      resource_group_name  = var.communication_storage_account_resource_group
      container_name       = "processing-message"
      role                 = "writer"
      description          = "Allow web app to read and write blob"
    },
  ]

  storage_queue = [{
    storage_account_name = var.communication_storage_account_name
    resource_group_name  = var.communication_storage_account_resource_group
    queue_names          = ["message-created-v2", "message-created-v2-poison"]
    role                 = "writer"
    description          = "Allow web app to wtite messages in queues"
  }]

  cosmos = [
    {
      account_name        = var.common_cosmos_account.name
      resource_group_name = var.common_cosmos_account.resource_group_name
      description         = "Allow web app to read on cosmos containers"
      role                = "writer"
      database            = "db"
      collections         = ["messages", "message-status"]
    }
  ]
}

resource "azurerm_role_assignment" "messages_ca_appinsights_metrics_publisher" {
  scope                = var.application_insights.id
  role_definition_name = "Monitoring Metrics Publisher"
  principal_id         = module.messages_ca.principal_id
  description          = "Allow messages container app to publish telemetry to Application Insights"
}
