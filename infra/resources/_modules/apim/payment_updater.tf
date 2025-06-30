resource "azurerm_api_management_product" "apim_itn_product_payments" {
  product_id   = "io-payments-api"
  display_name = "IO PAYMENTS API"
  description  = "Product for IO payments"

  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  published             = true
  subscription_required = true
  approval_required     = false
}

resource "azurerm_api_management_product_policy" "apim_itn_product_payments_policy" {
  product_id          = azurerm_api_management_product.apim_itn_product_payments.product_id
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  xml_content = file("../_modules/apim/product/policy.xml")
}

data "http" "payment_updater_openapi" {
  url = "https://raw.githubusercontent.com/pagopa/io-messages/refs/heads/main/apps/payment-updater/openapi.yaml"
}

resource "azurerm_api_management_api" "payments_updater_api_v1" {
  name                = format("%s-payments-updater-api", local.product)
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  revision            = "1"
  description         = "Payment Updater API"
  display_name        = "Payment Updater"

  path      = "api/v1/payment"
  protocols = ["https"]

  subscription_required = true
  service_url           = null

  import {
    content_format = "openapi"
    content_value  = data.http.payment_updater_openapi.response_body
  }
}

resource "azurerm_api_management_named_value" "paymentup_base_url" {
  name                = "paymentup-base-url"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  display_name        = "paymentup-base-url"
  value               = "${var.payment_updater_url}${azurerm_api_management_api.payments_updater_api_v1.path}"
}

resource "azurerm_api_management_api_policy" "payments_updater_api_v1_policy" {
  api_name            = azurerm_api_management_api.payments_updater_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  xml_content = file("../_modules/apim/api/payment-updater/policy.xml")
}

resource "azurerm_api_management_product_api" "payments_updater_api_v1_product_api" {
  product_id          = azurerm_api_management_product.apim_itn_product_payments.product_id
  api_name            = azurerm_api_management_api.payments_updater_api_v1.name
  api_management_name = azurerm_api_management_api.payments_updater_api_v1.api_management_name
  resource_group_name = azurerm_api_management_api.payments_updater_api_v1.resource_group_name
}

resource "azurerm_api_management_subscription" "payment_updater_reminder_itn" {
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  user_id             = azurerm_api_management_user.reminder_user_itn.id
  product_id          = azurerm_api_management_product.apim_itn_product_payments.id
  display_name        = "Payment Updater API"
  state               = "active"
  allow_tracing       = false
}

resource "azurerm_key_vault_secret" "reminder_payment_api_subscription_primary_key_itn" {
  name         = "reminder-paymentup-subscription-key"
  value        = azurerm_api_management_subscription.payment_updater_reminder_itn.primary_key
  content_type = "apim key used by reminder for paymentup endpoint"
  key_vault_id = local.key_vault.id
}
