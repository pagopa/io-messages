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


####APIM####

import {
  to = module.apim.azurerm_api_management_group.apiremotecontentconfigurationwrite_itn
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.ApiManagement/service/io-p-itn-apim-01/groups/apiremotecontentconfigurationwrite"
}
