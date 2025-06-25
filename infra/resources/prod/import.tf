####ITN APIM CONFIG IMPORTS####

#APIM GROUPS
import {
  to = module.apim.azurerm_api_management_group.apiremotecontentconfigurationwrite_itn
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/groups/apiremotecontentconfigurationwrite"
}

import {
  to = module.apim.azurerm_api_management_group.apithirdpartymessagewrite_itn
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/groups/apithirdpartymessagewrite"
}

import {
  to = module.apim.azurerm_api_management_group.apimessagewriteadvanced_itn
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/groups/apimessagewriteadvanced"
}

import {
  to = module.apim.azurerm_api_management_group.apimessagereadadvanced_itn
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/groups/apimessagereadadvanced"
}

import {
  to = module.apim.azurerm_api_management_group.apinewmessagenotify_itn
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/groups/apinewmessagenotify"
}

import {
  to = module.apim.azurerm_api_management_group.apiremindernotify_itn
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/groups/apiremindernotify"
}

import {
  to = module.apim.azurerm_api_management_group.apipaymentupdater_itn
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/groups/apipaymentread"
}

#APIM NOTIFICATIONS PRODUCT API

import {
  to = module.apim.azurerm_api_management_product.apim_itn_product_notifications
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/products/io-notifications-api"
}

import {
  to = module.apim.azurerm_api_management_product_policy.apim_itn_product_notifications_policy
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/products/io-notifications-api"
}

#sending external API
import {
  to = module.apim.azurerm_api_management_api.messages_sending_external_api_v1
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/apis/io-p-weu-messages-sending-external-api-01"
}

import {
  to = module.apim.azurerm_api_management_api_policy.messages_sending_external_api_v1_policy
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/apis/io-p-weu-messages-sending-external-api-01"
}

import {
  to = module.apim.azurerm_api_management_product_api.messages_sending_external_api_v1_product_api
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/products/io-services-api/apis/io-p-weu-messages-sending-external-api-01"
}

#sending internal API
import {
  to = module.apim.azurerm_api_management_api.messages_sending_internal_api_v1
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/apis/io-p-weu-messages-sending-internal-api-01"
}

import {
  to = module.apim.azurerm_api_management_api_policy.messages_sending_internal_api_v1_policy
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/apis/io-p-weu-messages-sending-internal-api-01"
}

import {
  to = module.apim.azurerm_api_management_product_api.messages_sending_internal_api_v1_product_api
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/products/io-notifications-api/apis/io-p-weu-messages-sending-internal-api-01"
}

#APIM USERS

import {
  to = module.apim.azurerm_api_management_user.reminder_user_itn
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/users/iopremiumreminderuser"
}
import {
  to = module.apim.azurerm_api_management_group_user.reminder_group_itn
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/groups/apiremindernotify/users/iopremiumreminderuser"
}
import {
  to = module.apim.azurerm_api_management_group_user.payment_group_itn
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/groups/apipaymentread/users/iopremiumreminderuser"
}

#APIM SUBSCRIPTIONS
import {
  to = module.apim.azurerm_api_management_subscription.payment_updater_reminder_itn
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/subscriptions/990380b9-322d-42ae-97ee-c01ca7e239ef"
}
import {
  to = module.apim.azurerm_api_management_subscription.reminder_itn
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/subscriptions/a3e037a9-b250-41e8-8395-39cfb22f98a5"
}


#APIM SECRETS
import {
  to = module.apim.azurerm_key_vault_secret.reminder_subscription_primary_key_itn
  id = "https://io-p-itn-com-kv-01.vault.azure.net/secrets/reminder-notification-subscription-key/e5e1f0f304ed45d28b67a2b004fdab13"
}
import {
  to = module.apim.azurerm_key_vault_secret.reminder_payment_api_subscription_primary_key_itn
  id = "https://io-p-itn-com-kv-01.vault.azure.net/secrets/reminder-paymentup-subscription-key/f1579fdf8cff44c484c840723d73d0c0"
}


#APIM PAYMENT UPDATE PRODUCT API

import {
  to = module.apim.azurerm_api_management_product.apim_itn_product_payments
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/products/io-payments-api"
}

import {
  to = module.apim.azurerm_api_management_product_policy.apim_itn_product_payments_policy
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/products/io-payments-api"
}

#payment updater API
import {
  to = module.apim.azurerm_api_management_api.payments_updater_api_v1
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/apis/io-p-payments-updater-api"
}

import {
  to = module.apim.azurerm_api_management_api_policy.payments_updater_api_v1_policy
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/apis/io-p-payments-updater-api"
}

import {
  to = module.apim.azurerm_api_management_product_api.payments_updater_api_v1_product_api
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/products/io-payments-api/apis/io-p-payments-updater-api"
}


