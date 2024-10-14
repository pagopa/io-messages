module "messages-evh" {
  source = "github.com/pagopa/dx//infra/modules/azure_event_hub?ref=3f205e62474782678a563f4cff92e479a34feecd"

  environment = {
    prefix          = var.prefix
    env_short       = var.env_short
    location        = var.location
    domain          = var.domain
    app_name        = local.eventhub_name
    instance_number = var.instance_number
  }

  eventhubs = [{
    name                   = local.eventhub_name
    partitions             = local.eventhub_partition_count
    message_retention_days = local.eventhub_message_retention
    keys                   = local.eventhub_auth_messages_keys
    consumers              = []
  }]

  resource_group_name = local.resource_group_name

  tags = var.tags

  subnet_pep_id = local.subnet_pep_id
}
