data "azurerm_key_vault_secret" "appinsights_connection_string" {
  name         = "appinsights-connection-string"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "mongo_database_uri" {
  name         = "messages-reminder-mongodb-account-connection-string"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "kafka_url_message" {
  name         = "messages-weu-prod01-evh-reminder-jaas-connection-string"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "kafka_url_messagestatus" {
  name         = "messages-status-weu-prod01-evh-reminder-jaas-connection-string"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "kafka_url_messagesend" {
  name         = "messages-reminder-send-weu-prod01-evh-reminder-jaas-connection-string"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "kafka_url_shared" {
  name         = "payments-updates-weu-prod01-evh-reminder-jaas-connection-string"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "proxy_endpoint_subscription_key" {
  name         = "pagopa-proxy-prod-subscription-key"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "paymentupdater_endpoint_subscription_key" {
  name         = "payment-api-subscription-key-itn"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "notify_endpoint_subscription_key" {
  name         = "subscription-key-itn"
  key_vault_id = var.key_vault_id
}
data "azurerm_key_vault_secret" "mysql_url" {
  name         = "reminder-mysql-reminder-mysql-db-url"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "mysql_user" {
  name         = "reminder-mysql-db-adm-username"
  key_vault_id = var.key_vault_id
}

data "azurerm_key_vault_secret" "mysql_password" {
  name         = "reminder-mysql-db-adm-password"
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
