resource "azurerm_api_management_subscription" "payment_updater_reminder_itn" {
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  user_id             = azurerm_api_management_user.reminder_user_itn.id
  product_id          = azurerm_api_management_product.apim_itn_product_payments.id
  display_name        = "Payment Updater API"
  state               = "active"
  allow_tracing       = false
}

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

  xml_content = file("../_modules/apim/api_product/policy.xml")
}

# PAYMENT UPDATER API

resource "azurerm_api_management_api" "payments_updater_api_v1" {
  name                = format("%s-payments-updater-api", local.product)
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  revision            = "1"
  description         = "IO Payments - Updater API"
  display_name        = "IO Payments - Updater API"

  path      = "api/v1/payment"
  protocols = ["https"]

  subscription_required = true
  service_url           = null

  import {
    content_format = "openapi"
    content_value  = file("../_modules/apim/api/payments_updater/v1/_openapi.yaml")
  }
}

resource "azurerm_api_management_api_policy" "payments_updater_api_v1_policy" {
  api_name            = azurerm_api_management_api.payments_updater_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  xml_content = file("../_modules/apim/api/payments_updater/v1/_base_policy.xml")
}


resource "azurerm_api_management_product_api" "payments_updater_api_v1_product_api" {
  product_id          = azurerm_api_management_product.apim_itn_product_payments.product_id
  api_name            = azurerm_api_management_api.payments_updater_api_v1.name
  api_management_name = azurerm_api_management_api.payments_updater_api_v1.api_management_name
  resource_group_name = azurerm_api_management_api.payments_updater_api_v1.resource_group_name
}
