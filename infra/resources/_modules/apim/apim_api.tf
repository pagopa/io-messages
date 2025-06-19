
# BACKEND NOTIFICAZTION API
resource "azurerm_api_management_api" "io_backend_notification_itn_api_v1" {
  name                = format("%s-io-backend-notification-api", local.product)
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  revision            = "1"
  display_name        = "IO Backend - Notification API"
  description         = "IO Backend - Notification API"

  path                  = "io-backend-notification/api/v1"
  protocols             = ["https"]
  service_url           = null
  subscription_required = false

  import {
    content_format = "openapi"
    content_value  = file("../_modules/apim/api/io-backend-notification/v1/_openapi.yaml")
  }
}

resource "azurerm_api_management_api_policy" "io_backend_notification_itn_api_v1_policy" {
  api_name            = azurerm_api_management_api.io_backend_notification_itn_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  xml_content = file("../_modules/apim/api/io-backend-notification/v1/_base_policy.xml")
}


resource "azurerm_api_management_product_api" "io_backend_notification_itn_api_v1_product_api" {
  product_id          = azurerm_api_management_product.apim_itn_product_notifications.product_id
  api_name            = azurerm_api_management_api.io_backend_notification_itn_api_v1.name
  api_management_name = azurerm_api_management_api.io_backend_notification_itn_api_v1.api_management_name
  resource_group_name = azurerm_api_management_api.io_backend_notification_itn_api_v1.resource_group_name
}


#SENDING FUNC API - EXTERNAL

resource "azurerm_api_management_api" "messages_sending_external_api_v1" {
  name                = format("%s-%s-messages-sending-external-api-01", local.product, var.legacy_location_short)
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  revision            = "1"
  description         = "IO Messages Sending - External - API"
  display_name        = "IO Messages Sending - External - API"

  path                  = "api/v1/messages-sending"
  protocols             = ["https"]
  service_url           = null
  subscription_required = true

  import {
    content_format = "openapi"
    content_value  = file("../../../apps/sending-func/openapi/index_external.yaml")
  }
}

resource "azurerm_api_management_api_policy" "messages_sending_external_api_v1_policy" {
  api_name            = azurerm_api_management_api.messages_sending_external_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  xml_content = file("../_modules/apim/api/messages-sending/v1/_base_policy_external.xml")
}

resource "azurerm_api_management_product_api" "messages_sending_external_api_v1_product_api" {
  product_id          = data.azurerm_api_management_product.apim_itn_product_services.product_id
  api_name            = azurerm_api_management_api.messages_sending_external_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
}


# SENDING FUNC API - INTERNAL

resource "azurerm_api_management_api" "messages_sending_internal_api_v1" {
  name                = format("%s-%s-messages-sending-internal-api-01", local.product, var.legacy_location_short)
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  revision            = "1"

  description  = "IO Messages Sending - Internal - API"
  display_name = "IO Messages Sending - Internal - API"

  path      = "api/v1/messages-sending/internal"
  protocols = ["https"]

  subscription_required = true
  service_url           = null

  import {
    content_format = "openapi"
    content_value  = file("../../../apps/sending-func/openapi/index.yaml")
  }

}

resource "azurerm_api_management_api_policy" "messages_sending_internal_api_v1_policy" {
  api_name            = azurerm_api_management_api.messages_sending_internal_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  xml_content = file("../_modules/apim/api/messages-sending/v1/_base_policy_internal.xml")
}

resource "azurerm_api_management_product_api" "messages_sending_internal_api_v1_product_api" {
  product_id          = azurerm_api_management_product.apim_itn_product_notifications.product_id
  api_name            = azurerm_api_management_api.messages_sending_internal_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
}


# SERVICE MESSSAGE API - EXTERNAL

resource "azurerm_api_management_api" "service_messages_manage_api_v1" {
  name = format("%s-service-messages-manage-api", local.product)

  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  revision = "1"

  description  = "IO Service Messages - Manage - API"
  display_name = "IO Service Messages - Manage - API"

  path                  = "service-messages/manage/api/v1"
  protocols             = ["https"]
  subscription_required = true
  service_url           = null

  import {
    content_format = "openapi"
    content_value  = file("../_modules/apim/api/service-messages/_index_external.yaml")
  }

}

resource "azurerm_api_management_api_policy" "service_messages_manage_api_v1_policy" {
  api_name            = azurerm_api_management_api.service_messages_manage_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  xml_content = file("../_modules/apim/api/service-messages/v1/_base_policy.xml")
}

resource "azurerm_api_management_product_api" "service_messages_manage_api_v1_product_api" {

  product_id          = data.azurerm_api_management_product.apim_itn_product_services.product_id
  api_name            = azurerm_api_management_api.service_messages_manage_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
}
