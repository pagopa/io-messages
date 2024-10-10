locals {
  eventhub_namespace_name      = "io-p-evh-ns"
  eventhub_resource_group_name = "io-p-evt-rg"
  eventhub_partition_count     = 32
  eventhub_message_retention   = 7
  eventhub_auth_messages_key = {
    name   = "io-messages"
    listen = false
    send   = true
    manage = false
  }
  eventhub_auth_pdnd_key = {
    name   = "pdnd"
    listen = true
    send   = false
    manage = false
  }
}
