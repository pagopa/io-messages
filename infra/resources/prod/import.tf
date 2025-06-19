import {
  to = azurerm_resource_group.notifications
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-notifications"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_namespace.sandbox_partition_1
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-notifications/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-sandbox-partition-1"
}

import {
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-notifications/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-sandbox"
  to = module.notification_hubs_weu.azurerm_notification_hub_namespace.sandbox
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_namespace.common_partition_4
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-4"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_namespace.common_partition_3
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-3"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_namespace.common_partition_2
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-2"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_namespace.common_partition_1
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-1"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_namespace.common
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_authorization_rule.sandbox_partition_1_default_listen
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-notifications/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-sandbox-partition-1/notificationHubs/io-p-ntf-sandbox-partition-1/authorizationRules/DefaultListenSharedAccessSignature"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_authorization_rule.sandbox_partition_1_default_full
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-notifications/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-sandbox-partition-1/notificationHubs/io-p-ntf-sandbox-partition-1/authorizationRules/DefaultFullSharedAccessSignature"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_authorization_rule.sandbox_default_listen
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-notifications/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-sandbox/notificationHubs/io-p-ntf-sandbox/authorizationRules/DefaultListenSharedAccessSignature"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_authorization_rule.sandbox_default_full
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-notifications/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-sandbox/notificationHubs/io-p-ntf-sandbox/authorizationRules/DefaultFullSharedAccessSignature"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_authorization_rule.common_partition_4_default_listen
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-4/notificationHubs/io-p-ntf-common-partition-4/authorizationRules/DefaultListenSharedAccessSignature"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_authorization_rule.common_partition_4_default_full
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-4/notificationHubs/io-p-ntf-common-partition-4/authorizationRules/DefaultFullSharedAccessSignature"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_authorization_rule.common_partition_3_default_listen
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-3/notificationHubs/io-p-ntf-common-partition-3/authorizationRules/DefaultListenSharedAccessSignature"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_authorization_rule.common_partition_3_default_full
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-3/notificationHubs/io-p-ntf-common-partition-3/authorizationRules/DefaultFullSharedAccessSignature"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_authorization_rule.common_partition_2_default_listen
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-2/notificationHubs/io-p-ntf-common-partition-2/authorizationRules/DefaultListenSharedAccessSignature"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_authorization_rule.common_partition_2_default_full
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-2/notificationHubs/io-p-ntf-common-partition-2/authorizationRules/DefaultFullSharedAccessSignature"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_authorization_rule.common_partition_1_default_listen
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-1/notificationHubs/io-p-ntf-common-partition-1/authorizationRules/DefaultListenSharedAccessSignature"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_authorization_rule.common_partition_1_default_full
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-1/notificationHubs/io-p-ntf-common-partition-1/authorizationRules/DefaultFullSharedAccessSignature"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_authorization_rule.common_default_listen
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common/notificationHubs/io-p-ntf-common/authorizationRules/DefaultListenSharedAccessSignature"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub_authorization_rule.common_default_full
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common/notificationHubs/io-p-ntf-common/authorizationRules/DefaultFullSharedAccessSignature"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub.sandbox_partition_1
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-notifications/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-sandbox-partition-1/notificationHubs/io-p-ntf-sandbox-partition-1"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub.sandbox
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-notifications/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-sandbox/notificationHubs/io-p-ntf-sandbox"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub.common_partition_4
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-4/notificationHubs/io-p-ntf-common-partition-4"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub.common_partition_3
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-3/notificationHubs/io-p-ntf-common-partition-3"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub.common_partition_2
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-2/notificationHubs/io-p-ntf-common-partition-2"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub.common_partition_1
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common-partition-1/notificationHubs/io-p-ntf-common-partition-1"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub.common01
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common/notificationHubs/io-p-ntf-common01"
}

import {
  to = module.notification_hubs_weu.azurerm_notification_hub.common
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.NotificationHubs/namespaces/io-p-ntfns-common/notificationHubs/io-p-ntf-common"
}

import {
  to = module.notification_hubs_weu.azurerm_monitor_metric_alert.alert_nh_common_pns_errors
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.Insights/metricAlerts/[IOCOM|NHLegacy] Push Notification Service errors"
}

import {
  to = module.notification_hubs_weu.azurerm_monitor_metric_alert.alert_nh_common_partition_4_pns_errors
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.Insights/metricAlerts/[IOCOM|NH4] Push Notification Service errors"
}

import {
  to = module.notification_hubs_weu.azurerm_monitor_metric_alert.alert_nh_common_partition_4_anomalous_pns_success_volume
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.Insights/metricAlerts/[IOCOM|NH4] Push Notification Service anomalous success volume"
}

import {
  to = module.notification_hubs_weu.azurerm_monitor_metric_alert.alert_nh_common_partition_3_pns_errors
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.Insights/metricAlerts/[IOCOM|NH3] Push Notification Service errors"
}

import {
  to = module.notification_hubs_weu.azurerm_monitor_metric_alert.alert_nh_common_partition_3_anomalous_pns_success_volume
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.Insights/metricAlerts/[IOCOM|NH3] Push Notification Service anomalous success volume"
}

import {
  to = module.notification_hubs_weu.azurerm_monitor_metric_alert.alert_nh_common_partition_2_pns_errors
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.Insights/metricAlerts/[IOCOM|NH2] Push Notification Service errors"
}

import {
  to = module.notification_hubs_weu.azurerm_monitor_metric_alert.alert_nh_common_partition_2_anomalous_pns_success_volume
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.Insights/metricAlerts/[IOCOM|NH2] Push Notification Service anomalous success volume"
}

import {
  to = module.notification_hubs_weu.azurerm_monitor_metric_alert.alert_nh_common_anomalous_pns_success_volume
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.Insights/metricAlerts/[IOCOM|NHLegacy] Push Notification Service anomalous success volume"
}

import {
  to = module.notification_hubs_weu.azurerm_monitor_metric_alert.alert_nh_common_partition_1_anomalous_pns_success_volume
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.Insights/metricAlerts/[IOCOM|NH1] Push Notification Service anomalous success volume"
}

import {
  to = module.notification_hubs_weu.azurerm_monitor_metric_alert.alert_nh_common_partition_1_pns_errors
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.Insights/metricAlerts/[IOCOM|NH1] Push Notification Service errors"
}


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

#APIM NOTIFICATIONS PRODUCT

import {
  to = module.apim.azurerm_api_management_product.apim_itn_product_notifications
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/products/io-notifications-api"
}

import {
  to = module.apim.azurerm_api_management_product_policy.apim_itn_product_notifications_policy
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/products/io-notifications-api"
}


##APIM NOTIFICATIONS API

#backend notification API
import {
  to = module.apim.azurerm_api_management_api.io_backend_notification_itn_api_v1
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/apis/io-p-io-backend-notification-api"
}

import {
  to = module.apim.azurerm_api_management_api_policy.io_backend_notification_itn_api_v1_policy
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/apis/io-p-io-backend-notification-api"
}

import {
  to = module.apim.azurerm_api_management_product_api.io_backend_notification_itn_api_v1_product_api
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/products/io-notifications-api/apis/io-p-io-backend-notification-api"
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

#service external API
import {
  to = module.apim.azurerm_api_management_api.service_messages_manage_api_v1
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/apis/io-p-service-messages-manage-api"
}

import {
  to = module.apim.azurerm_api_management_api_policy.service_messages_manage_api_v1_policy
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/apis/io-p-service-messages-manage-api"
}

import {
  to = module.apim.azurerm_api_management_product_api.service_messages_manage_api_v1_product_api
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/products/io-services-api/apis/io-p-service-messages-manage-api"
}

#service internal API
import {
  to = module.apim.azurerm_api_management_api.service_messages_internal_api_v1
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/apis/io-p-service-messages-internal-api"
}

import {
  to = module.apim.azurerm_api_management_api_policy.service_messages_internal_api_v1_policy
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/apis/io-p-service-messages-internal-api"
}

import {
  to = module.apim.azurerm_api_management_product_api.service_messages_internal_api_v1_product_api
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/products/io-notifications-api/apis/io-p-service-messages-internal-api"
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



#APIM SECRETS AND VALUES
import {
  to = module.apim.azurerm_key_vault_secret.reminder_payment_api_subscription_primary_key_itn
  id = "https://io-p-messages-kv.vault.azure.net/secrets/io-p-reminder-payment-api-subscription-key-itn/325879ffaa2a419a8a09a00814e087ed"
}

import {
  to = module.apim.azurerm_api_management_named_value.io_p_messages_sending_func_key_itn
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/namedValues/io-p-messages-sending-func-key"
}



