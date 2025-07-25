
import {
  to = module.mongo.module.reminder_cosmos_account.azurerm_cosmosdb_account.this
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-com-rg-01/providers/Microsoft.DocumentDB/databaseAccounts/io-p-messages-reminder-mongodb-account"
}

import {
  to = module.mongo.azurerm_cosmosdb_mongo_database.db_reminder
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-com-rg-01/providers/Microsoft.DocumentDB/databaseAccounts/io-p-messages-reminder-mongodb-account/mongodbDatabases/db"
}

import {
  to = module.mongo.module.mongdb_collection_reminder_sharded.azurerm_cosmosdb_mongo_collection.this
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-com-rg-01/providers/Microsoft.DocumentDB/databaseAccounts/io-p-messages-reminder-mongodb-account/mongodbDatabases/db/collections/reminder-sharded-new"
}

import {
  to = module.mongo.azurerm_key_vault_secret.mongodb_reminder_connection_string
  id = "https://io-p-itn-com-kv-01.vault.azure.net/secrets/reminder-mongo-connection-string/f54d9211e926470fa3a19e241d665634"
}

import {
  to = module.mongo.azurerm_key_vault_secret.mongodb_payments_connection_string
  id = "https://io-p-itn-com-kv-01.vault.azure.net/secrets/paymentup-mongo-connection-string/6ff42f4d5f0a4dc5a2f0684c178f3537"
}

import {
  to = module.mongo.module.payments_cosmos_account.azurerm_cosmosdb_account.this
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-com-rg-01/providers/Microsoft.DocumentDB/databaseAccounts/io-p-payments-mongodb-account"
}

import {
  to = module.mongo.azurerm_cosmosdb_mongo_database.db_payments
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-com-rg-01/providers/Microsoft.DocumentDB/databaseAccounts/io-p-payments-mongodb-account/mongodbDatabases/db"
}

import {
  to = module.mongo.module.mongdb_collection_payment_sharded.azurerm_cosmosdb_mongo_collection.this
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-com-rg-01/providers/Microsoft.DocumentDB/databaseAccounts/io-p-payments-mongodb-account/mongodbDatabases/db/collections/payment-sharded"
}

import {
  to = module.mongo.module.mongdb_collection_payment_retry.azurerm_cosmosdb_mongo_collection.this
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-com-rg-01/providers/Microsoft.DocumentDB/databaseAccounts/io-p-payments-mongodb-account/mongodbDatabases/db/collections/payment-retry"
}
