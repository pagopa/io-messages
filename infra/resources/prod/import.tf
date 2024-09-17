import {
  to = module.storage_api_weu.module.storage_api.azurerm_storage_account.this
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-internal/providers/Microsoft.Storage/storageAccounts/iopstapi"
}

import {
  to = module.storage_api_weu.module.storage_api.azurerm_security_center_storage_defender.this[0]
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-internal/providers/Microsoft.Storage/storageAccounts/iopstapi"
}

import {
  to = module.storage_api_weu.module.storage_api.azurerm_monitor_metric_alert.storage_account_low_availability[0]
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-internal/providers/Microsoft.Insights/metricAlerts/[iopstapi] Low Availability"
}

import {
  to = module.storage_api_weu.azurerm_storage_container.message_content
  id = "https://iopstapi.blob.core.windows.net/message-content"
}

import {
  to = module.storage_api_weu.azurerm_storage_container.cached
  id = "https://iopstapi.blob.core.windows.net/cached"
}

import {
  to = module.storage_api_weu.azurerm_storage_table.subscriptionsfeedbyday
  id = "https://iopstapi.table.core.windows.net/Tables('SubscriptionsFeedByDay')"
}

import {
  to = module.storage_api_weu.azurerm_storage_table.faileduserdataprocessing
  id = "https://iopstapi.table.core.windows.net/Tables('FailedUserDataProcessing')"
}

import {
  to = module.storage_api_weu.azurerm_storage_table.validationtokens
  id = "https://iopstapi.table.core.windows.net/Tables('ValidationTokens')"
}


import {
  to = module.storage_api_weu.module.storage_api_replica.azurerm_storage_account.this
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-internal/providers/Microsoft.Storage/storageAccounts/iopstapireplica"
}

import {
  to = module.storage_api_weu.module.storage_api_replica.azurerm_security_center_storage_defender.this[0]
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-internal/providers/Microsoft.Storage/storageAccounts/iopstapireplica"
}

import {
  to = module.storage_api_weu.module.storage_api_replica.azurerm_monitor_metric_alert.storage_account_low_availability[0]
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-internal/providers/Microsoft.Insights/metricAlerts/[iopstapireplica] Low Availability"
}

import {
  to = module.storage_api_weu.azurerm_storage_object_replication.api_replica
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-internal/providers/Microsoft.Storage/storageAccounts/iopstapi/objectReplicationPolicies/2509e215-0923-4cfe-b80d-b47c92b38c6e;/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-internal/providers/Microsoft.Storage/storageAccounts/iopstapireplica/objectReplicationPolicies/2509e215-0923-4cfe-b80d-b47c92b38c6e"
}

import {
  to = module.storage_api_weu.module.storage_api_events.azurerm_storage_account.this
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-internal/providers/Microsoft.Storage/storageAccounts/iopstapievents"
}

import {
  to = module.storage_api_weu.azurerm_storage_queue.events
  id = "https://iopstapievents.queue.core.windows.net/events"
}

import {
  to = module.storage_api_weu.azurerm_monitor_metric_alert.iopstapi_throttling_low_availability
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-common/providers/Microsoft.Insights/metricAlerts/[IO-COMMONS | iopstapi] Low Availability"
}
