locals {
  eventhub_name                = "io-messages-evh"
  eventhub_namespace_name      = "io-p-evh-ns"
  eventhub_resource_group_name = "io-p-evt-rg"
  eventhub_partition_count     = 32
  eventhub_message_retention   = 7
  eventhub_authorization_rule_keys = [
    {
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
    }
  ]


}
