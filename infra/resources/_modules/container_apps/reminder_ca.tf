data "azurerm_key_vault_secret" "reminder_mongo_database_uri" {
  name         = "reminder-mongo-connection-string"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "senders_to_skip" {
  name         = "reminder-senders-to-skip"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "senders_to_use" {
  name         = "reminder-senders-to-use"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "mysql_reminder_db_url" {
  name         = "mysql-reminder-db-url"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "mysql_user" {
  name         = "mysql-admin-username"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "mysql_password" {
  name         = "mysql-admin-password"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "notify_endpoint_subscription_key" {
  name         = "reminder-notification-subscription-key"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "paymentup_endpoint_subscription_key" {
  name         = "reminder-paymentup-subscription-key"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "reminder_messages_jaas_connection_string" {
  name         = "reminder-messages-kafka-jaas-connection-string"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "reminder_messages_status_jaas_connection_string" {
  name         = "reminder-messages-status-kafka-jaas-connection-string"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "reminder_messages_send_jaas_connection_string" {
  name         = "reminder-messages-send-kafka-jaas-connection-string"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "reminder_payment_updates_jaas_connection_string" {
  name         = "reminder-payment-updates-kafka-jaas-connection-string"
  key_vault_id = var.key_vault_id
}

module "reminder_ca_itn_01" {
  source  = "pagopa-dx/azure-container-app/azurerm"
  version = "~> 3.0"

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
      image        = "ghcr.io/pagopa/io-com-reminder:sha-3cfdfae"
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

  tier          = "s"
  revision_mode = "Single"

  target_port = 9090

  tags = var.tags
}

locals {
  reminder_ca = {
    app_settings = {
      APPLICATIONINSIGHTS_ROLE_NAME         = "io-p-itn-com-reminder-01",
      APPLICATIONINSIGHTS_CONNECTION_STRING = var.application_insights.connection_string
      REMINDER_DAY                          = "3",
      PAYMENT_DAY                           = "3",
      TEST_ACTIVE                           = "false",
      MAX_READ_MESSAGE                      = "3",
      MAX_PAID_MESSAGE                      = "4",
      START_DAY                             = "13",
      SENDER_SERVICE_NAME                   = "Reminder",
      SENDER_ORGANIZATION_NAME              = "PagoPA",
      SENDER_DEPARTMENT_NAME                = "AppIO",
      QUARTZ_SCHEDULER_TIMER_NOTIFY         = "0 0/10 8-20 ? * *",
      QUARTZ_SCHEDULER_TIMER_DELETE         = "0 * * ? * *",
      SCHEDULER_REMINDER_NOTIFY_ACTIVE      = "true",
      SCHEDULER_REMINDER_DELETE_ACTIVE      = "false",
      KAFKA_MESSAGE                         = "io-p-itn-com-etl-cqrs-message-evh-01",
      KAFKA_STATUS                          = "io-p-itn-com-etl-cqrs-message-status-evh-01",
      KAFKA_PAYMENT                         = "io-p-itn-com-etl-payment-updates-evh-01",
      KAFKA_SEND                            = "io-p-itn-com-etl-reminder-message-send-evh-01",
      RESTCALL_INTERVAL_FUNCTION            = "10000",
      RESTCALL_MAX_ATTEMPTS                 = "3",
      ENABLE_REST_KEY                       = "true",
      IS_ACTIVE_MESSAGE_CONSUMER            = "true",
      IS_ACTIVE_MESSAGESTATUS_CONSUMER      = "true",
      IS_ACTIVE_PAYMENT_CONSUMER            = "true",
      IS_ACTIVE_MESSAGESEND_CONSUMER        = "true",
      PAGOPA_ECOMMERCE_ENDPOINT             = "https://api.platform.pagopa.it/ecommerce/payment-requests-service/v1",
      SECURITY_PROTOCOL_REMINDER            = "SASL_SSL",
      SASL_MECHANISM_REMINDER               = "PLAIN",
      SECURITY_PROTOCOL_SHARED              = "SASL_SSL",
      SASL_MECHANISM_SHARED                 = "PLAIN",
      BOOTSTRAP_SERVER_REMINDER             = "io-p-itn-com-etl-evhns-01.servicebus.windows.net:9093", # internal queue for send message to notify
      BOOTSTRAP_SERVER_SHARED               = "io-p-itn-com-etl-evhns-01.servicebus.windows.net:9093", # queue messageUpdates from payment updater
      MONGO_DATABASE                        = "db",
      IO_NOTIFY_ENDPOINT                    = "https://api-internal.io.italia.it/api/v1/messages-sending/internal", #endpoint notify service
      PAYMENTUPDATER_ENDPOINT               = "https://api-app.internal.io.pagopa.it",                              #endpoint payment updater - implemented for call proxy by the payment updater, now not used. do not fill
      REMINDER_GENERIC_MAX_PAGE_SIZE        = "1000",
      REMINDER_PAYMENT_MAX_PAGE_SIZE        = "400",
      MAIN_LOGGING_LEVEL                    = "WARN",
      ENABLE_QUARTZ                         = "true",
      QUARTZ_MAXIMUM_POOL_SIZE              = "10",
      QUARTZ_MINIMUM_IDLE_CONNECTIONS       = "5",
      QUARTZ_IDLE_CONNECTIONS_TIMEOUT       = "10000",
    }

    secrets = [
      {
        name                = "MONGO_DATABASE_URI"
        key_vault_secret_id = data.azurerm_key_vault_secret.reminder_mongo_database_uri.versionless_id
      },
      {
        name                = "KAFKA_URL_MESSAGE"
        key_vault_secret_id = data.azurerm_key_vault_secret.reminder_messages_jaas_connection_string.versionless_id
      },
      {
        name                = "KAFKA_URL_MESSAGESTATUS"
        key_vault_secret_id = data.azurerm_key_vault_secret.reminder_messages_status_jaas_connection_string.versionless_id
      },
      {
        name                = "KAFKA_URL_MESSAGESEND"
        key_vault_secret_id = data.azurerm_key_vault_secret.reminder_messages_send_jaas_connection_string.versionless_id
      },
      {
        name                = "KAFKA_URL_SHARED"
        key_vault_secret_id = data.azurerm_key_vault_secret.reminder_payment_updates_jaas_connection_string.versionless_id
      },
      {
        name                = "PAGOPA_ECOMMERCE_KEY"
        key_vault_secret_id = data.azurerm_key_vault_secret.pagopa_ecommerce_key.versionless_id
      },
      {
        name                = "PAYMENTUPDATER_ENDPOINT_SUBSCRIPTION_KEY"
        key_vault_secret_id = data.azurerm_key_vault_secret.paymentup_endpoint_subscription_key.versionless_id
      },
      {
        name                = "IO_NOTIFY_ENDPOINT_SUBSCRIPTION_KEY"
        key_vault_secret_id = data.azurerm_key_vault_secret.notify_endpoint_subscription_key.versionless_id
      },
      {
        name                = "MYSQL_URL"
        key_vault_secret_id = data.azurerm_key_vault_secret.mysql_reminder_db_url.versionless_id
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
