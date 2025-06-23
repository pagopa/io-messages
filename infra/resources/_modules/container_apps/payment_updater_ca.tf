module "payment_updater_ca_itn_01" {
  source  = "pagopa-dx/azure-container-app/azurerm"
  version = "~> 3.0"

  container_app_environment_id = module.com_cae.id
  user_assigned_identity_id    = module.com_cae.user_assigned_identity.id

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = "paymentup"
    instance_number = "01"
  }

  resource_group_name = var.resource_group_name

  container_app_templates = [
    {
      image        = "ghcr.io/pagopa/io-com-payment-updater:latest"
      app_settings = local.payment_updater_ca.app_settings

      liveness_probe = {
        path          = "/api/v1/health/live"
        initial_delay = 60
      }

      readiness_probe = {
        path                    = "/api/v1/health/ready"
        success_count_threshold = 1
        failure_count_threshold = 3
      }
    }
  ]

  secrets = local.payment_updater_ca.secrets

  tier          = "s"
  revision_mode = "Single"

  target_port = 9090

  tags = var.tags
}

locals {
  payment_updater_ca = {
    app_settings = {
      APPLICATIONINSIGHTS_ROLE_NAME   = "io-p-itn-com-payment-updater-01",
      BOOTSTRAP_SERVER_MESSAGE        = "io-p-messages-weu-prod01-evh-ns.servicebus.windows.net:9093"
      KAFKA_MESSAGE                   = "messages"
      BOOTSTRAP_SERVER_PAYMENT        = "pagopa-p-weu-core-evh-ns03.servicebus.windows.net:9093"
      KAFKA_PAYMENTS                  = "nodo-dei-pagamenti-biz-evt"
      BOOTSTRAP_SERVER_PAYMENTUPDATES = "io-p-payments-weu-prod01-evh-ns.servicebus.windows.net:9093"
      KAFKA_PAYMENT_UPDATES           = "payment-updates"
      CHECKPOINT_SIZE                 = 10
      ENABLE_REST_KEY                 = "true"
      IS_ACTIVE_MESSAGE_CONSUMER      = "true"
      IS_ACTIVE_PAYMENT_CONSUMER      = "true",
      MAIN_LOGGING_LEVEL              = "ERROR"
      MONGO_COLLECTION_NAME           = "payment-sharded"
      MONGO_DATABASE                  = "db"
      MONGO_RETRY_COLLECTION_NAME     = "payment-retry"
      PROXY_ENDPOINT                  = "https://not-used-anymore"
      QUARTZ_SCHEDULER_TIMER_NOTIFY   = "0 /3 * ? * *"
      RESTCALL_INTERVAL_FUNCTION      = 10000
      RESTCALL_MAX_ATTEMPTS           = 3
      RETRY_INTERVAL_FUNCTION         = 10000
      RETRY_MAX_ATTEMPTS              = 10
      SASL_MECHANISM_PAYMENT          = "PLAIN"
      SECURITY_PROTOCOL_PAYMENT       = "SASL_SSL"
      SCHEDULER_RETRY_ACTIVE          = "true"
      SCHEDULER_RETRY_SIZE            = "100"
    }

    secrets = [
      {
        name                = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        key_vault_secret_id = data.azurerm_key_vault_secret.appinsights_connection_string.versionless_id
      },
      {
        name                = "MONGO_DATABASE_URI",
        key_vault_secret_id = data.azurerm_key_vault_secret.payments_mongo_database_uri.versionless_id
      },
      {
        name                = "KAFKA_URL_MESSAGE",
        key_vault_secret_id = data.azurerm_key_vault_secret.payment_updates_kafka_url_message.versionless_id
      },
      {
        name                = "KAFKA_URL_PAYMENTUPDATES",
        key_vault_secret_id = data.azurerm_key_vault_secret.payment_updates_kafka_url_paymentupdates.versionless_id
      },
      {
        name                = "KAFKA_URL_PAYMENT",
        key_vault_secret_id = data.azurerm_key_vault_secret.payment_updates_kafka_url_payment.versionless_id
      },
      {
        name                = "PROXY_ENDPOINT_SUBSCRIPTION_KEY",
        key_vault_secret_id = data.azurerm_key_vault_secret.proxy_endpoint_subscription_key.versionless_id
      }
    ]
  }
}
