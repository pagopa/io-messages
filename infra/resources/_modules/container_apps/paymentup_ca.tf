data "azurerm_key_vault_secret" "paymentup_mongo_database_uri" {
  name         = "paymentup-mongo-connection-string"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "paymentup_messages_jaas_connection_string" {
  name         = "paymentup-messages-kafka-jaas-connection-string"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "paymentup_nodo_dei_pagamenti_biz_evt_jaas_connection_string" {
  name         = "paymentup-nodo-dei-pagamenti-biz-evt-kafka-jaas-connection-string"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "paymentup_payment_updates_jaas_connection_string" {
  name         = "paymentup-payment-updates-kafka-jaas-connection-string"
  key_vault_id = var.key_vault_id
}

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
      image        = "ghcr.io/pagopa/io-com-payment-updater:sha-3aa09fa"
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

  pagopa_core_evhns_hostname = "pagopa-p-weu-core-evh-ns03.servicebus.windows.net"

  payment_updater_ca = {
    app_settings = {
      APPLICATIONINSIGHTS_ROLE_NAME         = "io-p-itn-com-payment-updater-01",
      APPLICATIONINSIGHTS_CONNECTION_STRING = var.application_insights.connection_string
      BOOTSTRAP_SERVER_MESSAGE              = "io-p-messages-weu-prod01-evh-ns.servicebus.windows.net:9093"
      KAFKA_MESSAGE                         = "messages"
      BOOTSTRAP_SERVER_PAYMENT              = "${local.pagopa_core_evhns_hostname}:9093"
      KAFKA_PAYMENTS                        = "nodo-dei-pagamenti-biz-evt"
      BOOTSTRAP_SERVER_PAYMENTUPDATES       = "io-p-payments-weu-prod01-evh-ns.servicebus.windows.net:9093"
      KAFKA_PAYMENT_UPDATES                 = "payment-updates"
      CHECKPOINT_SIZE                       = 10
      ENABLE_REST_KEY                       = "true"
      IS_ACTIVE_MESSAGE_CONSUMER            = "true"
      IS_ACTIVE_PAYMENT_CONSUMER            = "true",
      MAIN_LOGGING_LEVEL                    = "ERROR"
      MONGO_COLLECTION_NAME                 = "payment-sharded"
      MONGO_DATABASE                        = "db"
      MONGO_RETRY_COLLECTION_NAME           = "payment-retry"
      PAGOPA_ECOMMERCE_ENDPOINT             = "https://api.platform.pagopa.it/ecommerce/payment-requests-service/v1",
      QUARTZ_SCHEDULER_TIMER_NOTIFY         = "0 /3 * ? * *"
      RESTCALL_INTERVAL_FUNCTION            = 10000
      RESTCALL_MAX_ATTEMPTS                 = 3
      RETRY_INTERVAL_FUNCTION               = 10000
      RETRY_MAX_ATTEMPTS                    = 10
      SASL_MECHANISM_PAYMENT                = "PLAIN"
      SECURITY_PROTOCOL_PAYMENT             = "SASL_SSL"
      SCHEDULER_RETRY_ACTIVE                = "true"
      SCHEDULER_RETRY_SIZE                  = "100"
    }

    secrets = [
      {
        name                = "MONGO_DATABASE_URI",
        key_vault_secret_id = data.azurerm_key_vault_secret.paymentup_mongo_database_uri.versionless_id
      },
      {
        name                = "KAFKA_URL_MESSAGE",
        key_vault_secret_id = data.azurerm_key_vault_secret.paymentup_messages_jaas_connection_string.versionless_id
      },
      {
        name                = "KAFKA_URL_PAYMENTUPDATES",
        key_vault_secret_id = data.azurerm_key_vault_secret.paymentup_payment_updates_jaas_connection_string.versionless_id
      },
      {
        name                = "KAFKA_URL_PAYMENT",
        key_vault_secret_id = data.azurerm_key_vault_secret.paymentup_nodo_dei_pagamenti_biz_evt_jaas_connection_string.versionless_id
      },
      {
        name                = "PAGOPA_ECOMMERCE_KEY",
        key_vault_secret_id = data.azurerm_key_vault_secret.pagopa_ecommerce_key.versionless_id
      }
    ]
  }
}

# We need to create a DNS Forwarding Rule for the paymentup CA to resolve the pagopa-core-evhns hostname,
# as it is not an internal resource and is not resolvable by the default Azure DNS Resolver.
resource "azurerm_private_dns_resolver_forwarding_rule" "pagopa-core-evhns" {
  name                      = "pagopa-core-evhns"
  dns_forwarding_ruleset_id = var.dns_forwarding_ruleset_id
  domain_name               = "${local.pagopa_core_evhns_hostname}."
  enabled                   = true
  target_dns_servers {
    ip_address = "208.67.222.222" # OpenDNS
    port       = 53
  }
}
