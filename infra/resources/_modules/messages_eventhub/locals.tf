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

  subnet_pep_id = "io-p-vnet-common/io-p-eventhub-snet"

  tags = {
    CostCenter     = "TS310 - PAGAMENTI & SERVIZI"
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    Owner          = "IO"
    ManagementTeam = "IO Comunicazione"
    Source         = "https://github.com/pagopa/io-messages/blob/main/infra/resources/prod"
  }
}
