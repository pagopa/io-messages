locals {
  eventhub_name              = "${var.prefix}-${var.env_short}-${var.location}-${var.domain}-messages-evh-01"
  eventhub_partition_count   = 32
  eventhub_message_retention = 7
  resource_group_name        = "io-p-evt-rg"
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
