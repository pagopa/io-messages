locals {
  eventhub_name              = "messages-evh"
  eventhub_partition_count   = 32
  eventhub_message_retention = 7
  resource_group_name        = "io-p-itn-com-rg-01"
  eventhub_auth_messages_keys = [{
    name   = "io-messages"
    listen = false
    send   = true
    manage = false
    },
    {
      name   = "pdnd"
      listen = true
      send   = false
      manage = false
  }]
}
