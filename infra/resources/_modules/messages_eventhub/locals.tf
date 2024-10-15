locals {
  eventhub_name              = "${var.prefix}-${var.env_short}-${var.location}-${var.domain}-messages-evh-01"
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

  private_dns_zone_resource_group_name = "io-p-rg-common"

  subnet_pep_id = "io-p-itn-common-vnet-01/io-p-itn-pep-snet-01"
}
