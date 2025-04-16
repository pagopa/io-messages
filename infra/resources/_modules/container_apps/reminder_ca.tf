module "reminder_ca_itn_01" {
  source  = "pagopa-dx/azure-container-app/azurerm"
  version = "~> 1.0"

  container_app_environment_id = module.com_cae.id
  user_assigned_identity_id    = module.com_cae.user_assigned_identity.id

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = "reminder"
    instance_number = "01"
  }

  resource_group_name = var.resource_group_name

  container_app_templates = [
    {
      image        = "iopcommonacr.azurecr.io/io-premium-reminder-ms:0.16.0"
      app_settings = local.reminder_ca.app_settings

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

  secrets = local.reminder_ca.secrets

  acr_registry = "iopcommonacr.azurecr.io"

  tier          = "xs"
  revision_mode = "Single"

  target_port = 9090

  tags = var.tags
}

locals {
  reminder_ca = {
    app_settings = {
      WEBSITE_SITE_NAME                = "io-p-weuprod01-reminder-ms", # required to show cloud role name in application insights
      REMINDER_DAY                     = "3",
      PAYMENT_DAY                      = "3",
      TEST_ACTIVE                      = "false",
      MAX_READ_MESSAGE                 = "3",
      MAX_PAID_MESSAGE                 = "4",
      START_DAY                        = "13",
      SENDER_SERVICE_NAME              = "Reminder",
      SENDER_ORGANIZATION_NAME         = "PagoPA",
      SENDER_DEPARTMENT_NAME           = "AppIO",
      QUARTZ_SCHEDULER_TIMER_NOTIFY    = "0 0/10 8-20 ? * *",
      QUARTZ_SCHEDULER_TIMER_DELETE    = "0 * * ? * *",
      SCHEDULER_REMINDER_NOTIFY_ACTIVE = "true",
      SCHEDULER_REMINDER_DELETE_ACTIVE = "false",
      KAFKA_MESSAGE                    = "messages",
      KAFKA_STATUS                     = "message-status",
      KAFKA_PAYMENT                    = "payment-updates",
      KAFKA_SEND                       = "message-reminder-send",
      RESTCALL_INTERVAL_FUNCTION       = "10000",
      RESTCALL_MAX_ATTEMPTS            = "3",
      ENABLE_REST_KEY                  = "true",
      IS_ACTIVE_MESSAGE_CONSUMER       = "true",
      IS_ACTIVE_MESSAGESTATUS_CONSUMER = "true",
      IS_ACTIVE_PAYMENT_CONSUMER       = "true",
      IS_ACTIVE_MESSAGESEND_CONSUMER   = "true",
      PROXY_ERROR_STATUSCODE           = "PAA_PAGAMENTO_DUPLICATO,PPT_RPT_DUPLICATA,PPT_PAGAMENTO_DUPLICATO",
      PROXY_ENDPOINT                   = "https://api.platform.pagopa.it/checkout/auth/payments/v1",
      SECURITY_PROTOCOL_REMINDER       = "SASL_SSL",
      SASL_MECHANISM_REMINDER          = "PLAIN",
      SECURITY_PROTOCOL_SHARED         = "SASL_SSL",
      SASL_MECHANISM_SHARED            = "PLAIN",
      BOOTSTRAP_SERVER_MESSAGESEND     = "io-p-messages-weu-prod01-evh-ns.servicebus.windows.net:9093", # internal queue for send message to notify
      BOOTSTRAP_SERVER_SHARED          = "io-p-payments-weu-prod01-evh-ns.servicebus.windows.net:9093", # queue messageUpdates from payment updater
      BOOTSTRAP_SERVER_MESSAGESTATUS   = "io-p-messages-weu-prod01-evh-ns.servicebus.windows.net:9093", # change message status receved from IO
      BOOTSTRAP_SERVER_MESSAGE         = "io-p-messages-weu-prod01-evh-ns.servicebus.windows.net:9093", # message receved from IO
      MONGO_DATABASE                   = "db",
      IO_NOTIFY_ENDPOINT               = "https://api-internal.io.italia.it/api/v1/messages-sending/internal", #endpoint notify service
      PAYMENTUPDATER_ENDPOINT          = "https://api-app.internal.io.pagopa.it",                              #endpoint payment updater - implemented for call proxy by the payment updater, now not used. do not fill
      REMINDER_GENERIC_MAX_PAGE_SIZE   = "1000",
      REMINDER_PAYMENT_MAX_PAGE_SIZE   = "400",
      MAIN_LOGGING_LEVEL               = "WARN",
      ENABLE_QUARTZ                    = "true",
      QUARTZ_MAXIMUM_POOL_SIZE         = "10",
      QUARTZ_MINIMUM_IDLE_CONNECTIONS  = "5",
      QUARTZ_IDLE_CONNECTIONS_TIMEOUT  = "10000",
    }

    secrets = [
      {
        name                = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        key_vault_secret_id = data.azurerm_key_vault_secret.appinsights_connection_string.versionless_id
      },
      {
        name                = "MONGO_DATABASE_URI"
        key_vault_secret_id = data.azurerm_key_vault_secret.mongo_database_uri.versionless_id
      },
      {
        name                = "KAFKA_URL_MESSAGE"
        key_vault_secret_id = data.azurerm_key_vault_secret.kafka_url_message.versionless_id
      },
      {
        name                = "KAFKA_URL_MESSAGESTATUS"
        key_vault_secret_id = data.azurerm_key_vault_secret.kafka_url_messagestatus.versionless_id
      },
      {
        name                = "KAFKA_URL_MESSAGESEND"
        key_vault_secret_id = data.azurerm_key_vault_secret.kafka_url_messagesend.versionless_id
      },
      {
        name                = "KAFKA_URL_SHARED"
        key_vault_secret_id = data.azurerm_key_vault_secret.kafka_url_shared.versionless_id
      },
      {
        name                = "PROXY_ENDPOINT_SUBSCRIPTION_KEY"
        key_vault_secret_id = data.azurerm_key_vault_secret.proxy_endpoint_subscription_key.versionless_id
      },
      {
        name                = "PAYMENTUPDATER_ENDPOINT_SUBSCRIPTION_KEY"
        key_vault_secret_id = data.azurerm_key_vault_secret.paymentupdater_endpoint_subscription_key.versionless_id
      },
      {
        name                = "IO_NOTIFY_ENDPOINT_SUBSCRIPTION_KEY"
        key_vault_secret_id = data.azurerm_key_vault_secret.notify_endpoint_subscription_key.versionless_id
      },
      {
        name                = "MYSQL_URL"
        key_vault_secret_id = data.azurerm_key_vault_secret.mysql_url.versionless_id
      },
      {
        name                = "MYSQL_USER"
        key_vault_secret_id = data.azurerm_key_vault_secret.mysql_user.versionless_id
      },
      {
        name                = "MYSQL_PASSWORD"
        key_vault_secret_id = data.azurerm_key_vault_secret.mysql_password.versionless_id
      },
      {
        name                = "SENDERS_TO_SKIP"
        key_vault_secret_id = data.azurerm_key_vault_secret.senders_to_skip.versionless_id
      },
      {
        name                = "SENDERS_TO_USE"
        key_vault_secret_id = data.azurerm_key_vault_secret.senders_to_use.versionless_id
      }
    ]
  }
}
