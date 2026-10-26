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

data "azuread_client_config" "current" {}

resource "azuread_application" "messages_api" {
  display_name     = "${var.environment.prefix}-${var.environment.env_short}-messages-api"
  owners           = [data.azuread_client_config.current.object_id]
  sign_in_audience = "AzureADMyOrg"

  api {
    requested_access_token_version = 2
  }

  app_role {
    allowed_member_types = ["Application"]
    description          = "Allows the assigned application to invoke the messages API"
    display_name         = "Messages API caller"
    enabled              = true
    id                   = "ae22b2be-65d5-4484-8137-c52f59c28e34"
    value                = "Messages.Invoke"
  }
}

resource "azuread_application_identifier_uri" "messages_api" {
  application_id = azuread_application.messages_api.id
  identifier_uri = "api://${azuread_application.messages_api.client_id}"
}

resource "azuread_service_principal" "messages_api" {
  client_id                    = azuread_application.messages_api.client_id
  app_role_assignment_required = true
}

resource "azuread_application_password" "messages_api" {
  application_id = azuread_application.messages_api.id
  display_name   = "messages-container-app-easy-auth"
}

resource "azurerm_key_vault_secret" "messages_api_easy_auth_client_secret" {
  name         = "messages-api-easy-auth-client-secret"
  key_vault_id = var.key_vault_id
  value        = azuread_application_password.messages_api.value
  content_type = "Microsoft Entra ID client secret for messages Container App Easy Auth"
}

module "messages_ca" {
  source  = "pagopa-dx/azure-container-app/azurerm"
  version = "~> 6.1"

  authentication = {
    azure_active_directory = {
      client_id                  = azuread_application.messages_api.client_id
      tenant_id                  = var.tenant_id
      client_secret_key_vault_id = azurerm_key_vault_secret.messages_api_easy_auth_client_secret.versionless_id
    }
  }

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
        FF_AGE_ELIGIBILITY_ENABLED      = "false"
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

        PAGOPA_ECOMMERCE_BASE_URL     = "https://api.platform.pagopa.it/ecommerce/payment-requests-service/v1"
        PAGOPA_ECOMMERCE_UAT_BASE_URL = "https://api.uat.platform.pagopa.it/ecommerce/payment-requests-service/v1"

        MESSAGE_CREATED_QUEUE_NAME        = "message-created-v2"
        PROCESSING_MESSAGE_CONTAINER_NAME = "processing-message"

        LOLLIPOP_API_URL = "https://io-p-itn-auth-lollipop-func-02.azurewebsites.net/api/v1"
        LOLLIPOP_API_KEY = "dummy"
      }

      secret_names = ["PAGOPA_ECOMMERCE_API_KEY", "PAGOPA_ECOMMERCE_UAT_API_KEY", "LOLLIPOP_API_KEY"]

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

  secrets = [
    {
      name                = "PAGOPA_ECOMMERCE_API_KEY"
      key_vault_secret_id = data.azurerm_key_vault_secret.pagopa_ecommerce_key.versionless_id
    },
    {
      name                = "PAGOPA_ECOMMERCE_UAT_API_KEY"
      key_vault_secret_id = data.azurerm_key_vault_secret.pagopa_ecommerce_uat_key.versionless_id
    },
    {
      name                = "LOLLIPOP_API_KEY"
      key_vault_secret_id = data.azurerm_key_vault_secret.lollipop_api_key.versionless_id
    }
  ]

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

  key_vault = [
    {
      name                = var.key_vault_name
      resource_group_name = var.resource_group_name
      description         = "Allow messages container app to resolve Key Vault secret references"
      roles = {
        secrets = "reader"
      }
    }
  ]
}

resource "azurerm_role_assignment" "messages_ca_appinsights_metrics_publisher" {
  scope                = var.application_insights.id
  role_definition_name = "Monitoring Metrics Publisher"
  principal_id         = module.messages_ca.principal_id
  description          = "Allow messages container app to publish telemetry to Application Insights"
}
