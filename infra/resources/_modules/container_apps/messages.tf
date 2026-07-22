module "messages_ca" {
  source  = "pagopa-dx/azure-container-app/azurerm"
  version = "~> 6.0"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = "messages"
    instance_number = "01"
  }

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
        COMMON_COSMOS_URI               = var.common_cosmos_account.endpoint
        COMMON_STORAGE_ACCOUNT_URI      = var.common_storage_account.endpoint
        PN_SERVICE_ID                   = "01G40DWQGKY5GRWSNM4303VNRP" # PN

        APPLICATIONINSIGHTS_CONNECTION_STRING     = var.application_insights.connection_string
        APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED = "true"
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
    }
  ]

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

